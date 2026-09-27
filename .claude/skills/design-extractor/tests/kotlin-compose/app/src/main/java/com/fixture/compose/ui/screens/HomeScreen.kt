package com.fixture.compose.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import com.fixture.compose.R
import com.fixture.compose.ui.components.EntryCard
import com.fixture.compose.ui.components.EntryStatus
import com.fixture.compose.ui.components.PrimaryButton
import com.fixture.compose.ui.theme.AppColors
import com.fixture.compose.ui.theme.AppType
import com.fixture.compose.ui.theme.HeroGradient
import com.fixture.compose.ui.theme.Spacing

@Composable
fun HomeScreen(streak: Int, onAdd: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().background(AppColors.Background)) {
        Column(modifier = Modifier.fillMaxWidth().background(HeroGradient).padding(Spacing.L)) {
            Text(text = stringResource(R.string.home_title), style = AppType.Headline, color = AppColors.Background)
            Spacer(Modifier.height(Spacing.S))
            Text(text = stringResource(R.string.home_streak, streak), style = AppType.Display, color = AppColors.Background)
        }
        Column(modifier = Modifier.padding(Spacing.M)) {
            EntryCard(title = "Morning run", status = EntryStatus.DONE)
            Spacer(Modifier.height(Spacing.S))
            EntryCard(title = "Read 20 pages", status = EntryStatus.PENDING)
            Spacer(Modifier.height(Spacing.L))
            PrimaryButton(text = stringResource(R.string.home_add), onClick = onAdd)
        }
    }
}

@Preview
@Composable
internal fun HomeScreenPreview() = HomeScreen(streak = 12, onAdd = {})
