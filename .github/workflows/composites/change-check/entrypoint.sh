#!/usr/bin/env bash

set -e

echo "Input files: ${INPUT_FILES[*]}"
FILES=$(echo "${INPUT_FILES[*]}" | awk '{gsub(/ /,"\n"); print $0;}' | awk -v d="|" '{s=(NR==1?s:s d)$0}END{print s}')
ALL_CHANGED_AND_MODIFIED=$(git diff --diff-filter="*ACDMRTUX" --name-only HEAD~1 HEAD | grep -E "(${FILES})" | awk -v d="|" '{s=(NR==1?s:s d)$0}END{print s}')
echo "!!!"
echo "!!! Fotech action-change-check: Files to check: $FILES"
echo "!!! Files changed: $ALL_CHANGED_AND_MODIFIED"
echo "!!!"
if [ "$ALL_CHANGED_AND_MODIFIED" != "" ]; then
    echo "!!!"
    echo "!!! Fotech action-change-check: Changes detected"
    echo "!!!"
    echo "::set-output name=changed::true"
else
    echo "!!!"
    echo "!!! Fotech action-change-check: No changes detected"
    echo "!!!" 
    echo "::set-output name=changed::false"
fi
