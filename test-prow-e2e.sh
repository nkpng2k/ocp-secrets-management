#!/usr/bin/env bash

set -exuo pipefail

ARTIFACT_DIR=${ARTIFACT_DIR:=/tmp/artifacts}
RESULTS_DIR=integration-tests/results
INSTALLER_DIR=${INSTALLER_DIR:=${ARTIFACT_DIR}/installer}
COVERAGE_DIR=${COVERAGE_DIR:=coverage}
ENABLE_COVERAGE=${ENABLE_COVERAGE:=false}

function copyArtifacts {
  if [ -d "$ARTIFACT_DIR" ] && [ -d "$RESULTS_DIR" ]; then
    if [[ -z "$(ls -A -- "$RESULTS_DIR")" ]]; then
      echo "No artifacts were copied."
    else
      echo "Copying artifacts from $(pwd)..."
      cp -r "$RESULTS_DIR" "${ARTIFACT_DIR}/results"
    fi
  fi

  # Copy coverage reports if coverage is enabled
  if [ "$ENABLE_COVERAGE" = "true" ] && [ -d "$COVERAGE_DIR" ]; then
    echo "Copying coverage reports from $(pwd)/${COVERAGE_DIR}..."
    cp -r "$COVERAGE_DIR" "${ARTIFACT_DIR}/coverage"
  fi
}

trap copyArtifacts EXIT


# don't log kubeadmin-password
set +x
BRIDGE_KUBEADMIN_PASSWORD="$(cat "${KUBEADMIN_PASSWORD_FILE:-${INSTALLER_DIR}/auth/kubeadmin-password}")"
export BRIDGE_KUBEADMIN_PASSWORD
set -x
BRIDGE_BASE_ADDRESS="$(oc get consoles.config.openshift.io cluster -o jsonpath='{.status.consoleURL}')"
export BRIDGE_BASE_ADDRESS

echo "Install dependencies"
if [ ! -d node_modules ]; then
  yarn install
fi

# Run tests with or without coverage based on ENABLE_COVERAGE flag
if [ "$ENABLE_COVERAGE" = "true" ]; then
  echo "Running Playwright E2E tests with coverage enabled"
  yarn run test-e2e-headless
  echo "Generating coverage report"
  yarn run coverage
else
  echo "Running Playwright E2E tests in headless mode"
  yarn run test-e2e-headless
fi
