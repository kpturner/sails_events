#!/usr/bin/env bash

set -e

echo "::group::changed-files-from-source-file"

IFS=" " read -r -a FILES <<< "$(echo "${INPUT_FILES[@]}" | sort -u | tr "\n" " ")"

echo "Input Files: ${FILES[*]}"

echo "::set-output name=files::${FILES[*]}"

echo "::endgroup::"
