package com.fixture.compose.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

// One stop is hardcoded — it must still become a token
val HeroGradient = Brush.verticalGradient(
    colors = listOf(AppColors.Primary, Color(0xFF1E3A8A)),
)

val GlowGradient = Brush.radialGradient(
    colors = listOf(AppColors.Primary.copy(alpha = 0.2f), Color.Transparent),
)
