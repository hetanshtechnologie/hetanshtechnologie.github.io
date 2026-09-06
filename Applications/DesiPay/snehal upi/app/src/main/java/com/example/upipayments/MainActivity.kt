package com.example.upipayments

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupActionBarWithNavController
import com.example.upipayments.databinding.ActivityMainBinding

/**
 * Single-Activity host for the whole app.
 *
 * All screens live in the Navigation graph (see res/navigation/nav_graph.xml)
 * and are swapped inside the NavHostFragment. Keeping one Activity means the
 * back stack, up-navigation and shared state (the ViewModel) all work for us.
 */
class MainActivity : AppCompatActivity() {

    // ViewBinding generates a typed binding class from activity_main.xml,
    // removing findViewById() calls entirely.
    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // The MaterialToolbar declared in activity_main.xml acts as our
        // ActionBar (the theme is NoActionBar).
        setSupportActionBar(binding.toolbar)

        // Find the NavController that backs this Activity's NavHostFragment,
        // then let Navigation drive the ActionBar (title + up button).
        val navHostFragment =
            supportFragmentManager.findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        setupActionBarWithNavController(navHostFragment.navController)
    }

    // Make the toolbar's up arrow pop the Navigation back stack
    // (used on the confirmation screen to return to the form).
    override fun onSupportNavigateUp(): Boolean {
        val navHostFragment =
            supportFragmentManager.findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        return navHostFragment.navController.navigateUp() || super.onSupportNavigateUp()
    }
}
