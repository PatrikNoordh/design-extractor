package com.fixture.compose.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.fixture.compose.ui.theme.AppColors
import com.fixture.compose.ui.theme.AppShapes
import com.fixture.compose.ui.theme.AppType
import com.fixture.compose.ui.theme.Spacing

enum class EntryStatus { DONE, PENDING }

@Composable
fun EntryCard(title: String, status: EntryStatus, modifier: Modifier = Modifier) {
    val statusColor = if (status == EntryStatus.DONE) AppColors.Success else AppColors.Warning
    Row(
        modifier = modifier
            .fillMaxWidth()
            .shadow(2.dp, AppShapes.Large)
            .background(AppColors.Surface, AppShapes.Large)
            .border(1.dp, AppColors.Border, AppShapes.Large)
            .padding(Spacing.M),
    ) {
        Text(text = title, style = AppType.BodyLarge, color = AppColors.TextPrimary, modifier = Modifier.weight(1f))
        Text(
            text = status.name,
            style = AppType.Label,
            color = statusColor,
            modifier = Modifier.border(1.dp, statusColor, AppShapes.Pill).padding(horizontal = Spacing.S, vertical = Spacing.XS),
        )
    }
}

@Preview
@Composable
internal fun EntryCardDonePreview() = EntryCard(title = "Morning run", status = EntryStatus.DONE)

@Preview
@Composable
internal fun EntryCardPendingPreview() = EntryCard(title = "Read 20 pages", status = EntryStatus.PENDING)
