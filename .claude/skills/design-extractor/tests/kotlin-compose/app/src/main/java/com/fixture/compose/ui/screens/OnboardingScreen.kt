package com.fixture.compose.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import com.fixture.compose.R
import com.fixture.compose.ui.components.PrimaryButton
import com.fixture.compose.ui.theme.AppColors
import com.fixture.compose.ui.theme.AppType
import com.fixture.compose.ui.theme.Spacing

private const val PAGE_COUNT = 3

/** One route, three pages — the design export must produce one frame per page. */
@Composable
fun OnboardingScreen(onDone: () -> Unit) {
    val pagerState = rememberPagerState(pageCount = { PAGE_COUNT })
    HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize()) { page ->
        when (page) {
            0 -> OnboardingPage(stringResource(R.string.onboarding_welcome_title), stringResource(R.string.onboarding_welcome_body), stringResource(R.string.onboarding_next), onDone)
            1 -> OnboardingPage(stringResource(R.string.onboarding_track_title), stringResource(R.string.onboarding_track_body), stringResource(R.string.onboarding_next), onDone)
            else -> OnboardingPage(stringResource(R.string.onboarding_ready_title), stringResource(R.string.onboarding_ready_body), stringResource(R.string.onboarding_start), onDone)
        }
    }
}

@Composable
private fun OnboardingPage(title: String, body: String, button: String, onClick: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(Spacing.L),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.M, Alignment.CenterVertically),
    ) {
        Text(text = title, style = AppType.Headline, color = AppColors.TextPrimary)
        Text(text = body, style = AppType.BodyLarge, color = AppColors.TextSecondary)
        PrimaryButton(text = button, onClick = onClick)
    }
}

@Preview
@Composable
internal fun OnboardingScreenPreview() = OnboardingScreen(onDone = {})
