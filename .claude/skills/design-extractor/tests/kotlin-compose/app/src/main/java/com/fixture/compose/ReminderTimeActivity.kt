package com.fixture.compose

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.fixture.compose.ui.components.PrimaryButton
import com.fixture.compose.ui.theme.AppType
import com.fixture.compose.ui.theme.FixtureTheme
import com.fixture.compose.ui.theme.Spacing

/** Translucent Activity (Theme.Fixture.Translucent): a bottom sheet with a 24h time picker. */
class ReminderTimeActivity : ComponentActivity() {
    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            FixtureTheme {
                ModalBottomSheet(onDismissRequest = { finish() }) {
                    Column(modifier = Modifier.padding(horizontal = Spacing.L)) {
                        Text(text = stringResource(R.string.reminder_title), style = AppType.BodyLarge)
                        TimePicker(state = rememberTimePickerState(initialHour = 21, initialMinute = 30, is24Hour = true))
                        PrimaryButton(text = stringResource(R.string.reminder_save), onClick = { finish() })
                    }
                }
            }
        }
    }
}
