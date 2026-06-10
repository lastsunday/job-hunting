FROM alpine:3.20.2
WORKDIR /app
ARG TARGETOS TARGETARCH
COPY job-hunting-server-${TARGETOS}-${TARGETARCH} ./server
EXPOSE 3000 
CMD ["./server"]
