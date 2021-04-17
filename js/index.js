// FIREBASE
// Your web app's Firebase configuration
var firebaseConfig = {
  apiKey: "AIzaSyC4bGdEReoQzmNmf8UXioN_PErYO2BxLWs",
  authDomain: "rando-wheel-org.firebaseapp.com",
  databaseURL: "https://rando-wheel-org-default-rtdb.firebaseio.com",
  projectId: "rando-wheel-org",
  storageBucket: "rando-wheel-org.appspot.com",
  messagingSenderId: "1053125924493",
  appId: "1:1053125924493:web:65eeaeec28709e091474c4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
let database = firebase.database();

// UTILITY METHODS
function randomNumber (start, length) {
  return Math.floor(Math.random() * length + start)
}
let wheelSpinning = false;

let colors = ["#FF9AA2", "#C7CEEA", "#FFB7B2", "#B5EAD7", "#FFDAC1", "#E2F0CB"]
let rollIndex = 0;

// Create new wheel object specifying the parameters at creation time.
let theWheel = new Winwheel({
  'outerRadius'     : 212,        // Set outer radius so wheel fits inside the background.
  'textFontSize'    : 24,         // Set default font size for the segments.
  'textAlignment'   : 'outer',    // Align text to outside of wheel.
  'textDirection'   : 'reversed',
  'numSegments'     : 0,         // Specify number of segments.
  'segments'        :             // Define segments including colour and text.
  [ ],
  'animation' :           // Specify the animation to use.
  {
      'type'     : 'spinToStop',
      'duration' : 5,    // Duration in seconds.
      'spins'    : 10,     // Default number of complete spins.
      'callbackFinished' : alertPrize   // Specify pins are to trigger the sound, the other option is 'segment'.
  }
});

let app = new Vue({
  el: '#app',
  data: {
    rolls: [],
    choices: [ ],
    recentlyPicked: null,
    choicesText: "Group 1\nGroup 2\nGroup 3\nGroup 4"
  },
  created () {
    database.ref('spinning').set('false')
    $("#loader").show()
    // Initialize Wheel
    this.loadWheelFromText()
  },
  methods: {
    initRolls() {
      this.rolls = [ ]
      // Initialize random pulls
      for (let i = 0; i < 10; i++) {
        this.addRandomPull()
      }
    },
    loadWheelFromDb() {
      $("#loader").show()
      database.ref('choices').once('value', (snapshot) => {
        const data = snapshot.val();

        if (data.length < 1) {
          alert("You are not allowed to enter less than 1 option!")
          return
        }

        $("#loader").hide()
        this.loadWheel(data)
      });
    },
    loadWheelFromText() {
      let tempChoices = this.choicesText.split("\n")
      tempChoices = tempChoices.filter(function (el) {
        return el !== "" && el != null;
      });

      if (tempChoices.length < 1) {
        alert("You are not allowed to enter less than 1 option!")
        return
      }

      database.ref('choices').set(tempChoices, (err) => {
        if (err) {
          return
        }

        this.loadWheelFromDb()
      })
    },
    loadWheel(tempChoices) {
      this.choices = tempChoices
      let toDelete = theWheel.numSegments
      for (let i = 1; i < toDelete; i++) {
        theWheel.deleteSegment(i)
      }

      let start = 1
      if (theWheel.numSegments == 0) {
        start = 0
      } else {
        theWheel.segments[1].fillStyle = colors[0]
        theWheel.segments[1].text = this.choices[0]
      }

      for (let i = start; i < this.choices.length; i++) {
        let choice = this.choices[i]
        theWheel.addSegment({
          fillStyle: colors[i % colors.length],
          text: choice
        })
      }

      theWheel.draw()
      this.initRolls()
    },
    addRandomPull () {
      if (theWheel.numSegments < 0) {
        return
      }

      const randomNo = randomNumber(0, theWheel.numSegments)
      this.rolls.push(randomNo)
      database.ref('rolls').set(this.rolls)
    },
    removeSelectedSegment () {
      let index = this.choices.indexOf(this.recentlyPicked.text)
      theWheel.deleteSegment(index+1)
      this.choices.splice(index, 1)
      
      database.ref('choices').set(this.choices, (err) => {
        if (err) {
          return
        }

        this.loadWheelFromDb()
      })

      theWheel.draw()
    },
    targetSegmentText (rollIndex) {
      return this.choices[rollIndex]
    },
    spinButtonTrigger() {
      let rollIndex = this.rolls[0]
      database.ref('spinning').set(true, () => {
        console.log('spinning')
        startSpin(rollIndex)
      })
    }
  }
})

// update rolls from db
database.ref('rolls').on('value', (snapshot) => {
  app.rolls = snapshot.val()
})

// -------------------------------------------------------
// Click handler for spin button.
// -------------------------------------------------------
function startSpin(rollIndex)
{
  // Ensure that spinning can't be clicked again while already running.
  if (wheelSpinning == false) {
      // Get random angle inside specified segment of the wheel.
      let stopAt = theWheel.getRandomForSegment(rollIndex+1);

      // Important thing is to set the stopAngle of the animation before stating the spin.
      theWheel.animation.stopAngle = stopAt;

      // Begin the spin animation by calling startAnimation on the wheel object.
      theWheel.startAnimation();

      // Set to true so that power can't be changed and spin button re-enabled during
      // the current animation. The user will have to reset before spinning again.
      wheelSpinning = true;
  }
}

// -------------------------------------------------------
// Function for reset button.
// -------------------------------------------------------
function resetWheel()
{
  theWheel.stopAnimation(false);  // Stop the animation, false as param so does not call callback function.
  theWheel.rotationAngle = 0;     // Re-set the wheel angle to 0 degrees.
  theWheel.draw();                // Call draw to render changes to the wheel.

  wheelSpinning = false;          // Reset to false to power buttons and spin can be clicked again.
}

// -------------------------------------------------------
// Called when the spin animation has finished by the callback feature of the wheel because I specified callback in the parameters.
// -------------------------------------------------------
function alertPrize(indicatedSegment)
{
  app.rolls.splice(0, 1)
  database.ref('rolls').set(app.rolls, () => {
    database.ref('spinning').set(false, () => {
      // Just alert to the user what happened.
      app.recentlyPicked = indicatedSegment
      $('.ui.modal').modal('show');
    
      theWheel.stopAnimation(false);  // Stop the animation, false as param so does not call callback function.
      theWheel.rotationAngle = theWheel.rotationAngle % 360.
      wheelSpinning = false;          // Reset to false to power buttons and spin can be clicked again.
      theWheel.draw();                // Call draw to render changes to the wheel.
    })
  })
}