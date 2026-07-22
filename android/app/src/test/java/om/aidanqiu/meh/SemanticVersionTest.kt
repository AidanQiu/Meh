package com.aidanqiu.meh

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SemanticVersionTest {
    @Test fun acceptsKnownTagPrefixesAndWhitespace() {
        assertEquals(0, SemanticVersion.compare(" v1.2.3 ", "1.2.3"))
        assertEquals(0, SemanticVersion.compare("release-1.2.3", "1.2.3"))
    }

    @Test fun comparesNumericComponentsNumerically() {
        assertTrue(SemanticVersion.compare("1.10.0", "1.9.9")!! > 0)
    }

    @Test fun handlesOlderEqualAndNewerVersions() {
        assertTrue(SemanticVersion.compare("1.1.0", "1.1.1")!! < 0)
        assertEquals(0, SemanticVersion.compare("1.1.1", "1.1.1"))
        assertTrue(SemanticVersion.compare("1.1.2", "1.1.1")!! > 0)
        assertEquals(0, SemanticVersion.compare("1.2.3+5", "1.2.3+9"))
    }

    @Test fun stableReleaseIsNewerThanPrerelease() {
        assertTrue(SemanticVersion.compare("1.2.3", "1.2.3-beta")!! > 0)
        assertTrue(SemanticVersion.compare("1.2.3-beta.2", "1.2.3-beta.1")!! > 0)
    }

    @Test fun rejectsUnrecognizableTags() {
        assertNull(SemanticVersion.compare("latest", "1.2.3"))
    }
}
