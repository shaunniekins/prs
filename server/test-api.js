import axios from "axios";

// Test script for API endpoints
const API_BASE_URL = "http://localhost:3000/api";

const testAPI = async () => {
  console.log("Testing API endpoints...\n");

  try {
    // Test health endpoint
    console.log("1. Testing health endpoint...");
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log("✅ Health check:", healthResponse.data);

    // Test users endpoints
    console.log("\n2. Testing users endpoints...");
    try {
      const usersResponse = await axios.get(`${API_BASE_URL}/users`);
      console.log("✅ Get users:", usersResponse.data.length, "users found");
    } catch (error) {
      console.log(
        "❌ Get users failed:",
        error.response?.data?.message || error.message
      );
    }

    // Test login
    console.log("\n3. Testing login...");
    try {
      // Login test removed - requires actual user credentials
      console.log("ℹ️ Login test skipped - requires actual user credentials");
    } catch (error) {
      console.log(
        "❌ Login test skipped:",
        error.response?.data?.message || error.message
      );
    }

    // Test patients endpoints
    console.log("\n4. Testing patients endpoints...");
    try {
      const patientsResponse = await axios.get(`${API_BASE_URL}/patients`);
      console.log(
        "✅ Get patients:",
        patientsResponse.data.length,
        "patients found"
      );
    } catch (error) {
      console.log(
        "❌ Get patients failed:",
        error.response?.data?.message || error.message
      );
    }

    // Test appointments endpoints
    console.log("\n5. Testing appointments endpoints...");
    try {
      const appointmentsResponse = await axios.get(
        `${API_BASE_URL}/appointments`
      );
      console.log(
        "✅ Get appointments:",
        appointmentsResponse.data.length,
        "appointments found"
      );
    } catch (error) {
      console.log(
        "❌ Get appointments failed:",
        error.response?.data?.message || error.message
      );
    }

    // Test medical records endpoints
    console.log("\n6. Testing medical records endpoints...");
    try {
      const medicalRecordsResponse = await axios.get(
        `${API_BASE_URL}/medical-records`
      );
      console.log(
        "✅ Get medical records:",
        medicalRecordsResponse.data.length,
        "records found"
      );
    } catch (error) {
      console.log(
        "❌ Get medical records failed:",
        error.response?.data?.message || error.message
      );
    }

    // Test notifications endpoints
    console.log("\n7. Testing notifications endpoints...");
    try {
      const notificationsResponse = await axios.get(
        `${API_BASE_URL}/notifications`
      );
      console.log(
        "✅ Get notifications:",
        notificationsResponse.data.length,
        "notifications found"
      );
    } catch (error) {
      console.log(
        "❌ Get notifications failed:",
        error.response?.data?.message || error.message
      );
    }

    // Test staff endpoints
    console.log("\n8. Testing staff endpoints...");
    try {
      const staffResponse = await axios.get(`${API_BASE_URL}/staff`);
      console.log(
        "✅ Get staff:",
        staffResponse.data.length,
        "staff members found"
      );
    } catch (error) {
      console.log(
        "❌ Get staff failed:",
        error.response?.data?.message || error.message
      );
    }

    console.log("\n✅ API test completed!");
    console.log("\n📋 Setup Instructions:");
    console.log("1. Create a Supabase project at https://supabase.com");
    console.log("2. Copy .env.example to .env and update Supabase credentials");
    console.log(
      "3. Create database tables using the SQL script in DATABASE_SETUP.md"
    );
    console.log("4. Run: npm install");
    console.log("5. Run: npm run db:init");
    console.log("6. Run: npm run dev:full");
    console.log("7. The system will connect to your Supabase database");
  } catch (error) {
    console.error("❌ API test failed:", error.message);
  }
};

// Run the test
testAPI();
