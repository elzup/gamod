# @gamod/core

Test-only pieces shared by the game packages. **Not published** — game packages depend on it as a `devDependency` and only their `reference/` (the exhaustive-search oracle) imports it.

- `solve` / `evaluateMoves`: exhaustive search over a `Game<S, M>` with memoization. No evaluation function and no depth limit, so it only fits games whose state space can be walked end to end (or positions close enough to the end).
