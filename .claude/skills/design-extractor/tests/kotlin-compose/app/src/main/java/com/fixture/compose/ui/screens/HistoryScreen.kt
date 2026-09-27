package com.fixture.compose.ui.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.ui.Alignment
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import com.fixture.compose.R
import com.fixture.compose.ui.components.EntryCard
import com.fixture.compose.ui.components.EntryStatus
import com.fixture.compose.ui.theme.AppColors
import com.fixture.compose.ui.theme.AppType
import com.fixture.compose.ui.theme.Spacing

sealed interface HistoryUiState {
    data object Loading : HistoryUiState
    data object Empty : HistoryUiState
    data object Content : HistoryUiState
}

@Composable
fun HistoryScreen(state: HistoryUiState = HistoryUiState.Content) {
    when (state) {
        HistoryUiState.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = AppColors.Primary)
        }
        HistoryUiState.Empty -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(text = stringResource(R.string.history_empty), style = AppType.BodyLarge, color = AppColors.TextSecondary)
        }
        HistoryUiState.Content -> HistoryContent()
    }
}

@Composable
private fun HistoryContent() {
    Column(modifier = Modifier.padding(Spacing.M)) {
        Text(text = stringResource(R.string.history_title), style = AppType.Headline, color = AppColors.TextPrimary)
        Spacer(Modifier.height(Spacing.XS))
        Text(text = stringResource(R.string.history_subtitle), style = AppType.Body, color = AppColors.TextSecondary)
        Spacer(Modifier.height(Spacing.M))
        EntryCard(title = "Morning run", status = EntryStatus.DONE)
        Spacer(Modifier.height(Spacing.S))
        EntryCard(title = "Meditate", status = EntryStatus.DONE)
        Spacer(Modifier.height(Spacing.S))
        EntryCard(title = "Read 20 pages", status = EntryStatus.PENDING)
    }
}

@Preview
@Composable
internal fun HistoryScreenPreview() = HistoryScreen()
