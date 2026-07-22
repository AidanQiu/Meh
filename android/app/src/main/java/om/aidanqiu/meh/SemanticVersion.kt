package com.aidanqiu.meh

internal data class SemanticVersion(
    val numbers: List<Int>,
    val prerelease: List<String>
) : Comparable<SemanticVersion> {
    override fun compareTo(other: SemanticVersion): Int {
        val length = maxOf(numbers.size, other.numbers.size)
        repeat(length) { index ->
            val comparison = (numbers.getOrNull(index) ?: 0).compareTo(other.numbers.getOrNull(index) ?: 0)
            if (comparison != 0) return comparison
        }
        if (prerelease.isEmpty() && other.prerelease.isNotEmpty()) return 1
        if (prerelease.isNotEmpty() && other.prerelease.isEmpty()) return -1
        repeat(maxOf(prerelease.size, other.prerelease.size)) { index ->
            val left = prerelease.getOrNull(index) ?: return -1
            val right = other.prerelease.getOrNull(index) ?: return 1
            val leftNumber = left.toIntOrNull()
            val rightNumber = right.toIntOrNull()
            val comparison = when {
                leftNumber != null && rightNumber != null -> leftNumber.compareTo(rightNumber)
                leftNumber != null -> -1
                rightNumber != null -> 1
                else -> left.compareTo(right, ignoreCase = true)
            }
            if (comparison != 0) return comparison
        }
        return 0
    }

    companion object {
        private val VERSION_PATTERN = Regex(
            "^(?:v|release[-_\\s]*)?(\\d+(?:\\.\\d+)*)(?:-([0-9A-Za-z.-]+))?(?:\\+[0-9A-Za-z.-]+)?$",
            RegexOption.IGNORE_CASE
        )

        fun parse(value: String): SemanticVersion? {
            val match = VERSION_PATTERN.matchEntire(value.trim()) ?: return null
            val numbers = match.groupValues[1].split('.').map { part ->
                part.toIntOrNull() ?: return null
            }
            val prerelease = match.groupValues[2]
                .takeIf { it.isNotBlank() }
                ?.split('.')
                ?: emptyList()
            return SemanticVersion(numbers, prerelease)
        }

        fun compare(left: String, right: String): Int? {
            val leftVersion = parse(left) ?: return null
            val rightVersion = parse(right) ?: return null
            return leftVersion.compareTo(rightVersion)
        }
    }
}
