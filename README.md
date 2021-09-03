# Apocalipsis

Script to run vital metrics in any Wolox project.

## Metrics

This script as of today runs the following metrics:

- Code Quality
- Code Coverage
- Code Review Pick Up Time
- Code Review Merge Time

## Usage

```sh
docker run \
  --env HOST_PATH="${PWD}" \
  --volume /var/run/docker.sock:/var/run/docker.sock \
  -v "${PWD}/projects":/home/node/projects \
  wolox/apocalipsis
```

## Related repositories

- [Wolox/codeclimate](https://github.com/Wolox/codeclimate): Codeclimate CLI fork to compute Code Quality
- [Git Metrics](https://github.com/Wolox/metrics/tree/main/git): Package to compute Code Review Metrics

