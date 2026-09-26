package com.fixture.compose.ui.components

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.fixture.compose.ui.theme.AppColors
import com.fixture.compose.ui.theme.AppShapes
import com.fixture.compose.ui.theme.AppType

private val ButtonHeight = 48.dp

@Composable
fun PrimaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Button(
        onClick = onClick,
        shape = AppShapes.Medium,
        colors = ButtonDefaults.buttonColors(containerColor = AppColors.Primary, contentColor = AppColors.Background),
        modifier = modifier.fillMaxWidth().height(ButtonHeight),
    ) { Text(text = text, style = AppType.BodyLarge) }
}

@Composable
fun SecondaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    OutlinedButton(
        onClick = onClick,
        shape = AppShapes.Medium,
        colors = ButtonDefaults.outlinedButtonColors(contentColor = AppColors.Primary),
        border = null,
        modifier = modifier.fillMaxWidth().height(ButtonHeight)
            .border(1.dp, AppColors.Primary.copy(alpha = 0.6f), AppShapes.Medium),
    ) { Text(text = text, style = AppType.BodyLarge) }
}

@Preview
@Composable
internal fun PrimaryButtonPreview() = PrimaryButton(text = "Save", onClick = {})

@Preview
@Composable
internal fun SecondaryButtonPreview() = SecondaryButton(text = "Cancel", onClick = {})
