//base on https://github.com/adamziel/git-sparse-checkout-in-js/

import { GitPktLine } from '@/lib/isomorphic-git/models/GitPktLine.js'
import { GitTree } from '@/lib/isomorphic-git/models/GitTree.js'
import { GitAnnotatedTag } from '@/lib/isomorphic-git/models/GitAnnotatedTag.js'
import { GitCommit } from '@/lib/isomorphic-git/models/GitCommit.js'
import { GitPackIndex } from '@/lib/isomorphic-git/models/GitPackIndex.js'
import { collect } from '@/lib/isomorphic-git/utils/collect.js'
import { parseUploadPackResponse } from '@/lib/isomorphic-git/wire/parseUploadPackResponse.js'
import { Buffer } from 'buffer'
globalThis.Buffer = Buffer;

export async function lsTree({
    url = null,
    ref = "HEAD",
    getResponseAsyncFunction = async ({ url, method, headers, body }) => {
        return fetch(url, { method, headers, body });
    } } = {}) {
    const refs = await lsRefs(url, ref, { getResponseAsyncFunction });
    const commitHash = refs[ref];
    const treesIdx = await fetchWithoutBlobs(url, commitHash, { getResponseAsyncFunction });
    const pathMap = resolvePaths(treesIdx, commitHash);
    return pathMap;
}

export async function getFiles({
    url = null,
    oids = null,
    getResponseAsyncFunction = async ({ url, method, headers, body }) => {
        return fetch(url, { method, headers, body });
    }
} = {}
) {
    const blobsIdx = await fetchObjects(url, oids, { getResponseAsyncFunction });
    const result = new Map();
    await Promise.all(oids.map(async oid => {
        result.set(oid, await extractGitObjectFromIdx(blobsIdx, oid));
    }));
    return result;
}

async function walkTree({ idx = null, oid = null, parentPath = null, result = new Map() } = {}) {
    const tree = await idx.read({ oid });
    readObject(tree);
    for (const item of tree.object) {
        if (item.type == "blob") {
            const path = `${parentPath ?? ""}/${item.path}`;
            const oid = item.oid;
            result.set(path, oid);
        } else if (item.type == "tree") {
            await walkTree({ idx, oid: item.oid, parentPath: `${parentPath ?? ""}/${item.path}`, result });
        } else {
            //skip
        }
    }
}

async function resolvePaths(idx, commitHash) {
    const pathMap = new Map();
    const commit = await idx.read({
        oid: commitHash
    });
    readObject(commit);
    await walkTree({ idx, oid: commit.object.tree, result: pathMap });
    return pathMap;
}

export async function sparseCheckout(
    url,
    ref,
    paths,
    { getResponseAsyncFunction = async ({ url, method, headers, body }) => {
        return fetch(url, { method, headers, body });
    } } = {}
) {
    const refs = await lsRefs(url, ref, { getResponseAsyncFunction });
    const commitHash = refs[ref];
    const treesIdx = await fetchWithoutBlobs(url, commitHash, { getResponseAsyncFunction });
    const objects = await resolveObjects(treesIdx, commitHash, paths);

    const blobsIdx = await fetchObjects(url, paths.map(path => objects[path].oid), { getResponseAsyncFunction });

    const fetchedPaths = {};
    await Promise.all(paths.map(async path => {
        fetchedPaths[path] = await extractGitObjectFromIdx(blobsIdx, objects[path].oid)
    }));
    return fetchedPaths;
}


async function lsRefs(repoUrl, refPrefix, { getResponseAsyncFunction = async ({ url, method, headers, body }) => {
    return fetch(url, { method, headers, body });
} } = {}) {
    const packbuffer = Buffer.from(await collect([
        GitPktLine.encode(`command=ls-refs\n`),
        GitPktLine.encode(`agent=git/2.37.3\n`),
        GitPktLine.encode(`object-format=sha1\n`),
        GitPktLine.delim(),
        GitPktLine.encode(`peel\n`),
        GitPktLine.encode(`ref-prefix ${refPrefix}\n`),
        GitPktLine.flush(),
    ]));
    const response = await getResponseAsyncFunction({
        url: repoUrl + '/git-upload-pack', method: 'POST', headers: {
            'Accept': 'application/x-git-upload-pack-advertisement',
            'Content-Type': 'application/x-git-upload-pack-request',
            'Content-Length': packbuffer.length,
            'Git-Protocol': 'version=2'
        }, body: packbuffer
    })
    if(response.status != 200){
        throw `invalid response status ${response.status}`
    }
    const refs = {};
    for await (const line of parseGitResponseLines(response)) {
        const spaceAt = line.indexOf(' ');
        const ref = line.slice(0, spaceAt);
        const name = line.slice(spaceAt + 1, line.length - 1);
        refs[name] = ref;
    }
    return refs;
}

async function fetchWithoutBlobs(repoUrl, commitHash, { getResponseAsyncFunction = async ({ url, method, headers, body }) => {
    return fetch(url, { method, headers, body });
} } = {}) {
    const packbuffer = Buffer.from(await collect([
        GitPktLine.encode(`want ${commitHash} multi_ack_detailed no-done side-band-64k thin-pack ofs-delta agent=git/2.37.3 filter \n`),
        GitPktLine.encode(`filter blob:none\n`),
        GitPktLine.encode(`shallow ${commitHash}\n`),
        GitPktLine.encode(`deepen 1\n`),
        GitPktLine.flush(),
        GitPktLine.encode(`done\n`),
        GitPktLine.encode(`done\n`),
    ]));
    const response = await getResponseAsyncFunction({
        url: repoUrl + '/git-upload-pack',
        method: 'POST',
        headers: {
            'Accept': 'application/x-git-upload-pack-advertisement',
            'Content-Type': 'application/x-git-upload-pack-request',
            'Content-Length': packbuffer.length,
        },
        body: packbuffer
    })
    if(response.status != 200){
        throw `invalid response status ${response.status}`
    }
    const iterator = streamToIterator(await response.body);

    const parsed = await parseUploadPackResponse(iterator)
    const packfile = Buffer.from(await collect(parsed.packfile))
    const idx = await GitPackIndex.fromPack({
        pack: packfile
    });
    const originalRead = idx.read;
    idx.read = async function ({ oid, ...rest }) {
        const result = await originalRead.call(this, { oid, ...rest });
        result.oid = oid;
        return result;
    }
    return idx;
}

async function resolveObjects(idx, commitHash, paths) {
    const commit = await idx.read({
        oid: commitHash
    });
    readObject(commit);

    const rootTree = await idx.read({ oid: commit.object.tree });
    readObject(rootTree);

    // Resolve refs to fetch
    const resolvedOids = {};
    for (const path of paths) {
        let currentObject = rootTree;
        const segments = path.split('/');
        for (const segment of segments) {
            if (currentObject.type !== 'tree') {
                throw new Error(`Path not found in the repo: ${path}`);
            }

            let found = false;
            for (const item of currentObject.object) {
                if (item.path === segment) {
                    try {
                        currentObject = await idx.read({ oid: item.oid });
                        readObject(currentObject);
                    } catch (e) {
                        currentObject = item;
                    }
                    found = true;
                    break;
                }
            }
            if (!found) {
                throw new Error(`Path not found in the repo: ${path}`);
            }
        }
        resolvedOids[path] = currentObject;
    }
    return resolvedOids;
}

// Request oid for each resolvedRef
async function fetchObjects(repoUrl, objectHashes, { getResponseAsyncFunction = async ({ url, method, headers, body }) => {
    return fetch(url, { method, headers, body });
} } = {}) {
    const packbuffer = Buffer.from(await collect([
        ...objectHashes.map(objectHash =>
            GitPktLine.encode(`want ${objectHash} multi_ack_detailed no-done side-band-64k thin-pack ofs-delta agent=git/2.37.3 \n`),
        ),
        GitPktLine.flush(),
        GitPktLine.encode(`done\n`),
    ]));
    const response = await getResponseAsyncFunction({
        url: repoUrl + '/git-upload-pack',
        method: 'POST',
        headers: {
            'Accept': 'application/x-git-upload-pack-advertisement',
            'Content-Type': 'application/x-git-upload-pack-request',
            'Content-Length': packbuffer.length,
        },
        body: packbuffer
    })
    if(response.status != 200){
        throw `invalid response status ${response.status}`
    }
    const iterator = streamToIterator(await response.body);
    const parsed = await parseUploadPackResponse(iterator)
    const packfile = Buffer.from(await collect(parsed.packfile))
    return await GitPackIndex.fromPack({
        pack: packfile
    });
}

async function extractGitObjectFromIdx(idx, objectHash) {
    const tree = await idx.read({ oid: objectHash });
    readObject(tree);

    if (tree.type === "blob") {
        return tree.object;
    }

    const files = {};
    for (const { path, oid, type } of tree.object) {
        if (type === 'blob') {
            const object = await idx.read({ oid });
            readObject(object);
            files[path] = object.object;
        } else if (type === 'tree') {
            files[path] = await extractGitObjectFromIdx(idx, oid);
        }
    }
    return files;
}

function readObject(result) {
    if (!(result.object instanceof Buffer)) {
        return;
    }
    switch (result.type) {
        case 'commit':
            result.object = GitCommit.from(result.object).parse()
            break
        case 'tree':
            result.object = GitTree.from(result.object).entries()
            break
        case 'blob':
            result.object = new Uint8Array(result.object)
            result.format = 'content'
            break
        case 'tag':
            result.object = GitAnnotatedTag.from(result.object).parse()
            break
        default:
            throw new ObjectTypeError(
                result.oid,
                result.type,
                'blob|commit|tag|tree'
            )
    }
}

async function* parseGitResponseLines(response) {
    const text = await response.text();
    let at = 0;

    while (at <= text.length) {
        const lineLength = parseInt(text.substring(at, at + 4), 16);
        if (lineLength === 0) {
            break;
        }
        const line = text.substring(at + 4, at + lineLength);
        yield line;
        at += lineLength;
    }
}

function streamToIterator(stream) {
    // Use native async iteration if it's available.
    if (stream[Symbol.asyncIterator]) return stream
    const reader = stream.getReader()
    return {
        next() {
            return reader.read()
        },
        return() {
            reader.releaseLock()
            return {}
        },
        [Symbol.asyncIterator]() {
            return this
        },
    }
}
