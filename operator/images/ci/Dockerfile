FROM registry.ci.openshift.org/ocp/builder:rhel-9-golang-1.23-openshift-4.21 AS builder
WORKDIR /go/src/github.com/openshift/ocp-secrets-management-console

# Copy operator source code
COPY operator/ .

# Build operator binary
RUN make build

FROM registry.access.redhat.com/ubi9-minimal:latest

# Copy the operator binary from builder stage
COPY --from=builder /go/src/github.com/openshift/ocp-secrets-management-console/bin/manager /usr/bin/manager

# Run as non-root user
USER 65532:65532

ENTRYPOINT ["/usr/bin/manager"]
