FROM alpine:3.24.3
WORKDIR /app
ARG TARGETOS TARGETARCH
COPY job-hunting-server-${TARGETOS}-${TARGETARCH} ./server
EXPOSE 3000 
CMD ["./server"]
