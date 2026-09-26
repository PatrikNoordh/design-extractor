package com.fixture.compose

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.fixture.compose.navigation.AppNavGraph
import com.fixture.compose.ui.theme.FixtureTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { FixtureTheme { AppNavGraph() } }
    }
}
