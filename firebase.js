// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDI4BFAN9qVjyqwuGNiNyrBMrmizFIeunE",
  authDomain: "come-thru-e056c.firebaseapp.com",
  projectId: "come-thru-e056c",
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global variables for host page
let processedResponses = new Set(); // Track processed responses to avoid duplicates

// Add or update activity (replaces old timing for same activity)
async function addActivity(activity, time) {
  try {
    // Use activity name as document ID (this will replace any existing timing for the same activity)
    const activityId = activity.replace(/\s+/g, '_').toLowerCase();
    
    // Add or update activity (this will overwrite if it exists)
    await db.collection('activities_planned').doc(activityId).set({
      activity: activity,
      time: time,
      timestamp: new Date().toISOString(),
      status: 'pending'
    });
    
    console.log(`Activity "${activity}" set for ${time}`);
    return true; // Successfully added/updated
  } catch (error) {
    console.error('Error adding/updating activity:', error);
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

// Listen for all activity changes (for host page)
function listenForAllActivities(callback) {
  return db.collection('activities_planned')
    .orderBy('timestamp', 'desc')
    .onSnapshot(snapshot => {
      const activities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(activities);
    });
}

// HOST PAGE FUNCTIONS
// ====================

// Render activity history in the host page
function renderHistory(activities) {
  try {
    const log = $('#activityLog');
    log.empty();

    activities.forEach(item => {
      const li = $('<li>').css({
        marginBottom: '8px',
        background: 'rgba(255,255,255,0.1)',
        padding: '6px',
        borderRadius: '6px'
      });
      li.html(
        `<strong>${item.activity}</strong> (${item.time})<br>
        <small>${new Date(item.timestamp).toLocaleString()}</small><br>
        Status: <em>${item.status}</em>${item.responseTime ? ' at ' + new Date(item.responseTime).toLocaleTimeString() : ''}`
      );
      log.append(li);
    });
  } catch (error) {
    console.error('Error rendering history:', error);
  }
}

// Show response notification to host
function showResponseNotification(activity) {
  const notification = $('#responseNotification');
  const icon = $('#notifIcon');
  const title = $('#notifTitle');
  const message = $('#notifMessage');
  
  // Clear previous classes
  notification.removeClass('accepted declined');
  icon.removeClass('accepted declined');
  
  if (activity.status === 'accepted') {
    notification.addClass('accepted');
    icon.addClass('accepted');
    icon.text('✓');
    title.text('Invitation Accepted!');
    message.text(`Your invitation for "${activity.activity}" during ${activity.time} has been accepted.`);
  } else if (activity.status === 'declined') {
    notification.addClass('declined');
    icon.addClass('declined');
    icon.text('✗');
    title.text('Invitation Declined');
    message.text(`Your invitation for "${activity.activity}" during ${activity.time} has been declined.`);
  }
  
  notification.addClass('show');
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    dismissNotification();
  }, 5000);
}

// Dismiss notification
function dismissNotification() {
  $('#responseNotification').removeClass('show');
}

// Update date and time display
function updateDateTime() {
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString(undefined, { hour12: false });
  $('#dateHeader').text(dateStr);
  $('#timeSubheading').text(timeStr);
}

// Initialize host page functionality
function initializeHostPage() {
  // Set up real-time listener for activities
  const unsubscribe = listenForAllActivities((activities) => {
    renderHistory(activities);
    
    // Update button states based on current activities
    updateButtonStates(activities);
    
    // Check for new responses
    activities.forEach(activity => {
      if (activity.status && activity.status !== 'pending' && activity.responseTime) {
        const responseKey = `${activity.id}-${activity.responseTime}`;
        if (!processedResponses.has(responseKey)) {
          processedResponses.add(responseKey);
          showResponseNotification(activity);
        }
      }
    });
  });

  // Update date and time
  updateDateTime();
  setInterval(updateDateTime, 1000);

  // Handle time selection
  $('.time-select button').click(async function() {
    const parent = $(this).closest('.time-select');
    const activity = $(this).closest('.activity').data('activity');
    const time = $(this).data('time');

    try {
      // Add/update activity in Firebase (this will replace any existing timing)
      const success = await addActivity(activity, time);
      
      if (success) {
        // Update button states immediately for better UX
        // parent.find('button').removeClass('active');
        $(this).addClass('active');
        
        console.log(`Updated ${activity} to ${time}`);
      }
    } catch (error) {
      console.error('Error adding/updating activity:', error);
    }
  });
}

// Update button states based on current activities in database
function updateButtonStates(activities) {
  // Clear all active states first
  $('.time-select button').removeClass('active');
  
  // Set active state for current selections
  activities.forEach(activity => {
    // Add active class for both pending and accepted activities
    if (activity.status === 'pending' || activity.status === 'accepted') {
      const activityElement = $(`.activity[data-activity="${activity.activity}"]`);
      if (activityElement.length > 0) {
        activityElement.find(`button[data-time="${activity.time}"]`).addClass('active');
      }
    }
  });
}

// PARTY PAGE FUNCTIONS
// ====================

// Initialize party page functionality
function initializePartyPage() {
  let currentActivityId = null;

  // Listen for new activities
  const unsubscribe = listenForActivities((activity) => {
    console.log('New activity received:', activity);
    
    // Show notification
    $('#notification .notif-message').text(`${activity.activity} planned for ${activity.time}`);
    $('#notification').addClass('show');
    
    // Store the activity ID for response handling
    currentActivityId = activity.id;
  });

  // Handle accept button
  $('.accept').click(async function(){
    if (currentActivityId) {
      try {
        await updateActivityStatus(currentActivityId, 'accepted');
        $('#notification').removeClass('show');
        currentActivityId = null;
      } catch (error) {
        console.error('Error accepting invitation:', error);
      }
    }
  });

  // Handle decline button
  $('.decline').click(async function(){
    if (currentActivityId) {
      try {
        await updateActivityStatus(currentActivityId, 'declined');
        $('#notification').removeClass('show');
        currentActivityId = null;
      } catch (error) {
        console.error('Error declining invitation:', error);
      }
    }
  });
}