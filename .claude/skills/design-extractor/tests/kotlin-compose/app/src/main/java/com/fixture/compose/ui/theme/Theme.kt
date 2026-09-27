package com.fixture.compose.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

// Only some slots are overridden — surfaceContainerLow / surfaceContainerHighest keep M3 defaults
private val LightScheme = lightColorScheme(
    primary = AppColors.Primary,
    onPrimary = AppColors.Background,
    background = AppColors.Background,
    surface = AppColors.Surface,
    onSurface = AppColors.TextPrimary,
    outline = AppColors.Border,
    error = AppColors.Error,
)

private val DarkScheme = darkColorScheme(
    primary = AppColors.Primary,
    onPrimary = AppColors.Background,
    background = AppColors.BackgroundDark,
    surface = AppColors.SurfaceDark,
    onSurface = AppColors.TextPrimaryDark,
    error = AppColors.Error,
)

@Composable
fun FixtureTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) DarkScheme else LightScheme,
        content = content,
    )
}
