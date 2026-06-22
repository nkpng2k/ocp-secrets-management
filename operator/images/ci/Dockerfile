FROM registry.access.redhat.com/ubi9-minimal:latest

# Copy the pre-built operator binary from CI's binary_build_commands step
# CI builds the binary using: cd operator && make build
# The binary is available at operator/bin/manager in the source context
COPY operator/bin/manager /usr/bin/manager

# Run as non-root user
USER 65532:65532

ENTRYPOINT ["/usr/bin/manager"]
