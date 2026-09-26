package com.fixture.compose.ui.theme

import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// "Brand" is a placeholder name — it is still the platform default (Roboto)
private val Brand = FontFamily.Default

object AppType {
    val Display = TextStyle(fontFamily = Brand, fontWeight = FontWeight.Light, fontSize = 57.sp, letterSpacing = (-0.25).sp)
    val Headline = TextStyle(fontFamily = Brand, fontWeight = FontWeight.SemiBold, fontSize = 24.sp, lineHeight = 32.sp)
    val BodyLarge = TextStyle(fontFamily = Brand, fontWeight = FontWeight.Normal, fontSize = 16.sp, lineHeight = 24.sp)
    val Body = TextStyle(fontFamily = Brand, fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 20.sp)
    val Label = TextStyle(fontFamily = Brand, fontWeight = FontWeight.Medium, fontSize = 12.sp, letterSpacing = 0.5.sp)
}
