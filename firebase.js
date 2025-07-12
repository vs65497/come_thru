
// Firebase config from environment variables
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Test database connection
async function testDatabaseConnection() {
    try {
        // Test writing data
        const testDoc = await db.collection('test').add({
            message: 'Database connection test',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Database write test successful! Document ID:', testDoc.id);
        
        // Test reading data
        const snapshot = await db.collection('test').limit(1).get();
        console.log('✅ Database read test successful! Found', snapshot.size, 'documents');
        
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}

// Actually run the test
testDatabaseConnection().then(success => {
    if (success) {
        console.log('🎉 Database connection test completed successfully!');
    } else {
        console.log('💥 Database connection test failed!');
    }
});