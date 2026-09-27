package com.fixture.compose.navigation

import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.res.stringResource
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.fixture.compose.R
import com.fixture.compose.ui.screens.HistoryScreen
import com.fixture.compose.ui.screens.HomeScreen
import com.fixture.compose.ui.screens.OnboardingScreen
import com.fixture.compose.ui.screens.SettingsScreen

@Composable
fun AppNavGraph() {
    val navController = rememberNavController()
    val route by navController.currentBackStackEntryAsState()
    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(selected = route?.destination?.route == "home", onClick = { navController.navigate("home") },
                    icon = { Text("⌂") }, label = { Text(stringResource(R.string.nav_home)) })
                NavigationBarItem(selected = route?.destination?.route == "history", onClick = { navController.navigate("history") },
                    icon = { Text("☰") }, label = { Text(stringResource(R.string.nav_history)) })
                NavigationBarItem(selected = route?.destination?.route == "settings", onClick = { navController.navigate("settings") },
                    icon = { Text("⚙") }, label = { Text(stringResource(R.string.nav_settings)) })
            }
        },
    ) { padding ->
        NavHost(navController, startDestination = "onboarding", modifier = Modifier.padding(padding)) {
            composable("onboarding") { OnboardingScreen(onDone = { navController.navigate("home") }) }
            composable("home") { HomeScreen(streak = 12, onAdd = {}) }
            composable("history") { HistoryScreen() }
            composable("settings") { SettingsScreen(remindersOn = true, volume = 0.4f, onSignOut = {}) }
        }
    }
}
