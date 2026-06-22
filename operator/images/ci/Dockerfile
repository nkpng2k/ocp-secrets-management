FROM src AS builder

FROM registry.access.redhat.com/ubi9-minimal:latest

# Copy the pre-built operator binary from the src image
# CI builds it via binary_build_commands: cd operator && make build
COPY --from=builder /go/src/github.com/openshift/ocp-secrets-management-console/operator/bin/manager /usr/bin/manager

# Run as non-root user
USER 65532:65532

ENTRYPOINT ["/usr/bin/manager"]
