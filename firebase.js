// Firebase Configuration
const firebaseConfig = {
    apiKey: window.FIREBASE_API_KEY,
    authDomain: window.FIREBASE_AUTH_DOMAIN,
    projectId: window.FIREBASE_PROJECT_ID,
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Simple function to add activity (no duplicates)
async function addActivity(activity, time) {
  try {
    const activityId = `${activity}_${time}`;
    
    // Check if this activity already exists
    const existingActivity = await db.collection('activities_planned').doc(activityId).get();
    
    if (existingActivity.exists) {
      console.log('Activity already exists');
      return false; // Already exists
    }
    
    // Add new activity
    await db.collection('activities_planned').doc(activityId).set({
      activity: activity,
      time: time,
      timestamp: new Date().toISOString(),
      status: 'pending'
    });
    
    console.log('Activity added successfully');
    return true; // Successfully added
  } catch (error) {
    console.error('Error adding activity:', error);
    return false;
  }
}

// Listen for new activities (for party page)
function listenForActivities(callback) {
  return db.collection('activities_planned')
    .where('status', '==', 'pending')
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          callback({
            id: change.doc.id,
            ...change.doc.data()
          });
        }
      });
    });
}

// Update activity status (accept/decline)
async function updateActivityStatus(activityId, status) {
  try {
    await db.collection('activities_planned').doc(activityId).update({
      status: status,
      responseTime: new Date().toISOString()
    });
    console.log('Activity status updated to:', status);
  } catch (error) {
    console.error('Error updating activity status:', error);
  }
}

function getActivities() {
    return db.collection('activities_planned').get().then(snapshot => {
        console.log('Activities:', snapshot.docs.map(doc => doc.data()));
        return snapshot.docs.map(doc => doc.data());
    }).catch(error => {
        console.error('Error getting activities:', error);
        return [];
    });
}
