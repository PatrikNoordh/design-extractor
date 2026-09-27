package com.fixture.compose.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import com.fixture.compose.R
import com.fixture.compose.ui.components.SecondaryButton
import com.fixture.compose.ui.theme.AppColors
import com.fixture.compose.ui.theme.AppType
import com.fixture.compose.ui.theme.Spacing

@Composable
fun SettingsScreen(remindersOn: Boolean, volume: Float, onSignOut: () -> Unit) {
    var confirmSignOut by remember { mutableStateOf(false) }
    Column(modifier = Modifier.padding(Spacing.M), verticalArrangement = Arrangement.spacedBy(Spacing.M)) {
        Text(text = stringResource(R.string.settings_title), style = AppType.Headline, color = AppColors.TextPrimary)
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(text = stringResource(R.string.settings_reminders), style = AppType.BodyLarge, color = AppColors.TextPrimary)
            Switch(checked = remindersOn, onCheckedChange = {})
        }
        Text(text = stringResource(R.string.settings_volume), style = AppType.BodyLarge, color = AppColors.TextPrimary)
        Slider(value = volume, onValueChange = {})
        SecondaryButton(text = stringResource(R.string.settings_sign_out), onClick = { confirmSignOut = true })
    }
    if (confirmSignOut) {
        AlertDialog(
            onDismissRequest = { confirmSignOut = false },
            title = { Text(text = stringResource(R.string.settings_sign_out_title), style = AppType.Headline) },
            text = { Text(text = stringResource(R.string.settings_sign_out_body), style = AppType.Body) },
            confirmButton = { TextButton(onClick = onSignOut) { Text(stringResource(R.string.settings_sign_out)) } },
            dismissButton = { TextButton(onClick = { confirmSignOut = false }) { Text(stringResource(R.string.common_cancel)) } },
        )
    }
}

@Preview
@Composable
internal fun SettingsScreenPreview() = SettingsScreen(remindersOn = true, volume = 0.4f, onSignOut = {})
