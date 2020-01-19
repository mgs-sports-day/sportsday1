/* jshint esversion:6*/
// MGS Sports Day Website
// https://github.com/mgs-sports-day/sportsday1
// https://mgs-sportsday.net

(function() {
  "use strict";
  var sd = angular.module("sdApp", ["ngRoute", "ngAnimate", "angular-google-analytics", "angular-loading-bar"]);

  // *** ENVIRONMENT VARIABLES ***

  // constants for API reqs
  var apiKey = "AIzaSyCFfbIjKZGPkuXnYUFD4E14flZNKMC9rQE";
  var sheetId = "1chvNkQUq9WOKI3fHAbFzcvWLeTpeftWLwdH5cfisL5c";

  // survey enable switch
  var enableSurvey = true;
  var surveyURL = null;

  // set present year
  var thisCalYear = 2020;

  // show site development warning switch
  var devMode = true;

  // *** END ENVIRONMENT VARIABLES ***

  /**
   * Generate the URL for a GET request to the API
   * @param {string} range - The A1 notation of the values to retrieve
   * @param {string} dimension - The major dimension that results should use ("ROWS" or "COLUMNS")
   * @param {boolean} format - Should the retrieved data be string formatted as in GDocs?
   * @returns {string} - The encoded URL
   */
  function sdBuildQuery(range, dimension, format) {
    range = encodeURIComponent(range);
    if (format) {
      format = "FORMATTED_VALUE";
    } else {
      format = "UNFORMATTED_VALUE";
    }
    return "https://sheets.googleapis.com/v4/spreadsheets/" + sheetId + "/values/" + range + "?majorDimension=" + dimension + "&valueRenderOption=" + format + "&key=" + apiKey;
  }

  /**
   * Convert the 2D array from the API into a JSON object, using array[0] as the headers
   * @param {object} res - The array
   * @returns {object} - The JSON object
   */
  function sdParseRes(res) {
    var headers = res[0];
    var dataset = res.slice(1);
    var result = dataset.map(function (a) {
        var object = {};
        headers.forEach(function (k, i) {
            object[k] = a[i];
        });
        return object;
    });
    return result;
  }

  /**
   * Convert an integer to its spreadsheet column letter (e.g. 1 = A, 2 = B, 27 = AA, etc.)
   * @param {number} number - The integer to convert
   * @returns {string} - The column letter
   */
  function intToSpreadsheetColLetter(number) {
    var baseChar = ("A").charCodeAt(0);
    var letters  = "";
    do {
      number -= 1;
      letters = String.fromCharCode(baseChar + (number % 26)) + letters;
      number = (number / 26) >> 0;
    }
    while(number > 0);
    return letters;
  }

  /**
   * Set a cookie, by modifying document.cookie
   * @param {string} cname - The name of the cookie to set
   * @param {string} cvalue - The value to set this cookie to
   * @param {number} exdays - The length of time this cookie should be set for (in days - i.e. 24 hrs)
   */
  function setCookie(cname, cvalue, exdays) {
      var d = new Date();
      d.setTime(d.getTime() + (exdays*24*60*60*1000));
      var expires = "expires="+ d.toUTCString();
      document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
  }

  /**
   * Read a cookie
   * @param {string} cname - The name of the cookie to be read
   * @returns {string} - The value of this cookie
   */
  function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(";");
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == " ") {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
  }

  /**
   * SUBROUTINE: handle an API error
   * @param {object} res - The response from the server
   */
  function apiErr(res) {
    swal(
      {
        title: "Error! The API call failed!",
        text: "The website couldn't retrieve the data from the results spreadsheet.\nTry refreshing your web browser, or waiting a minute, and then refreshing. If this does not resolve the issue, please report it to the developers. Debug information is in the console.",
        icon: "error",
        button: "Dismiss"
      }
    );
    console.error("API call failure debug @ " + new Date());
    console.error(res);
  }

  // set up AngularJS routes
  sd.config(function($routeProvider) {
    $routeProvider
      .when("/", {
        templateUrl: "views/home.htm",
        controller: "home",
        timer: true
      })
      .when("/events", {
        templateUrl: "views/events.htm",
        timer: true
        // is dynamic, but pulls from rootScope only
      })
      .when("/e/:eventID/:year?", {
        // year is optional to allow handling of a null redirection
        templateUrl: "views/event.htm",
        controller: "event",
        timer: true
      })
      .when("/forms", {
        templateUrl: "views/forms.htm",
        controller: "forms",
        timer: true
      })
      .when("/f/:year/:letter", {
        templateUrl: "views/form.htm",
        controller: "form",
        timer: true
      })
      .when("/about", {
        templateUrl: "views/about.htm",
        timer: false
      })
      .when("/404", {
        templateUrl: "views/404.htm",
        timer: false
      })
      .when("/survey", {
        templateUrl: "views/survey.htm",
        timer: false
      })
      .when("/records/:year?", {
        // year is optional to allow handling of a null redirection
        templateUrl: "views/records.htm",
        controller: "records",
        timer: true
      })
      .when("/timetable", {
        templateUrl: "views/timetable.htm",
        timer: false
      })
      .when("/office", {
        templateUrl: "views/office.htm",
        controller: "office",
        timer: false
      })
      .otherwise({
        redirectTo: "/404"
      });
  });

  // Enable only loading bar, not spinner
  sd.config(["cfpLoadingBarProvider", function(cfpLoadingBarProvider) {
    cfpLoadingBarProvider.includeSpinner = false;
  }]);

  // Init GA
  sd.config(["AnalyticsProvider", function(AnalyticsProvider) {
    AnalyticsProvider.setAccount("UA-117967802-1");
    AnalyticsProvider.trackPages(true);
  }]).run(["Analytics", function(Analytics) {}]);

  // Runs on all views to:
  //  (1) Set list of possible year groups (once)
  //  (2) Load the events table (once)
  //  (3) Load the list of forms (once)
  //  (4) Load the bonus point to record allocation tbale (once)
  //  (5) Check if we need to enable the refresh timer
  //  (6) Check if we need to show the survey alert
  sd.controller("global", function($rootScope, $location, $scope, $http) {
    // pass devMode to views
    $rootScope.devMode = devMode;
    // set possible years
    $rootScope.possYears = ["7", "8", "9", "10"];
    // get events
    $http.get(sdBuildQuery("event_list!A2:F13", "ROWS", false))
      .then(function(res) {
        // success
        $rootScope.events = sdParseRes(res.data.values);
      }, function(res) {
        // failure
        apiErr(res);
      });
    // get forms
    $http.get(sdBuildQuery("summary!A3:B37", "ROWS", false))
      .then(function(res) {
        // success
        $rootScope.forms = sdParseRes(res.data.values);
      }, function(res) {
        // failure
        apiErr(res);
      });
    // get bonus points
    $http.get(sdBuildQuery("point_allocations_record!B3:B5", "ROWS", false))
      .then(function(res) {
        // success
        $rootScope.recordBonusValues = {
          "noRecord": res.data.values[0][0],
          "equal": res.data.values[1][0],
          "beat": res.data.values[2][0]
        };
      }, function(res) {
        // failure
        apiErr(res);
      });
    $rootScope.pagesCount = 0; // set initially to 0
    $scope.$on("$routeChangeStart", function($event, next) {
      if (next.timer) {
        $rootScope.timerEnabled = true;
      } else {
        $rootScope.timerEnabled = false;
      }
      $rootScope.pagesCount += 1;
      if ($rootScope.pagesCount >= 10) {
        if (getCookie("stopSurveyAlert") !== "true") {
          swal({
            title: "How are you finding the site?",
            text: "To aid in their work on the site, the developers have created a survey, to gauge user experience. Would you like to take this survey (it should only take 5 minutes)?",
            buttons: ["No", "Yes"]
          })
          .then((response) => {
            setCookie("stopSurveyAlert", "true", 0.5); // cookie to store if user wants survey -- 0.5 of a day = 12 hours
            if (response) { // if we get a true back from the alert window (i.e. user clicked "Yes")
              $location.path("/survey");
            } else {
              swal("OK, no problem. We won't ask you again.");
            }
          });
        }
      }
    });
  });

  // refresh timer code
  sd.controller("timer", function($scope, $route, $interval, $rootScope) {
    $scope.time = 120;
    $scope.plural = "s";
    $scope.$on("$routeChangeStart", function() {
      $scope.time = 120;
      $scope.plural = "s";
      if ($rootScope.timerEnabled) {
        $scope.timing = true;
        $interval.cancel($scope.timerInt);
        $scope.timerInt = undefined;
        $scope.timerInt = $interval(function() {
          $scope.time--;
          if ($scope.time === -1) {
            $route.reload();
            $scope.time = 120;
          }
          if ($scope.time === 1) {
            $scope.plural = "";
          } else {
            $scope.plural = "s";
          }
        }, 1000);
      } else {
        $scope.timing = false;
        $interval.cancel($scope.timerInt);
      }
    });
  });

  sd.controller("home", function($scope, $http) {
    $http.get(sdBuildQuery("summary!A3:E37", "ROWS", false))
      .then(function(res) {
        // success
        res = sdParseRes(res.data.values);
        res = _.sortBy(res, "schoolPos");
        $scope.topfive = res.slice(0, 5);
        $scope.all = res;
      }, function(res) {
        // failure
        apiErr(res);
      });
  });

  sd.controller("event", function($scope, $http, $routeParams, $location, $rootScope) {
    // set event name based on route request
    var matchingEvent = _.where($rootScope.events, {db: $routeParams.eventID});
    var matchingYear = _.contains($rootScope.possYears, $routeParams.year);
    if (_.isEmpty(matchingEvent)) {
      $location.path("/404");
    } else if ($routeParams.year == null) {
      $location.path("/e/" + matchingEvent[0].db + "/" + $rootScope.possYears[0]);
    } else if (!matchingYear) {
      $location.path("/404");
    } else {
      $scope.year = $routeParams.year;
      $scope.eventDetails = matchingEvent[0];
      var matchingYearLetters = _.where($rootScope.forms, {year: parseInt($routeParams.year)});
      // === RESULTS ===
      var ssRange = "y" + $scope.year + "_results!" + intToSpreadsheetColLetter($scope.eventDetails.startingCol) + "5:" +  intToSpreadsheetColLetter($scope.eventDetails.startingCol + 4) + "25";
      $http.get(sdBuildQuery(ssRange, "COLUMNS", false))
        .then(function(res) {
          // success
          var dataset = res.data;
          // add headers as first row of all arrays, ready for JSON parsing
          var resultsTabHeaders = ["letter", "pos", "pts"];
          var tabA = [resultsTabHeaders];
          var tabB = [resultsTabHeaders];
          var tabC = [resultsTabHeaders];
          var tabRB = [resultsTabHeaders];
          var tabTOTAL = [resultsTabHeaders];
          // for each column we get back from the API
          for (var i = 0; i < dataset.values.length; i++) {
            // get the current column header
            var currentColHead = dataset.values[i][0];
            // get rid of the first 3 rows (headers)
            var currentColData = dataset.values[i].slice(3);
            // for every form in this year group
            for (var j = 0; j < matchingYearLetters.length; j++) {
              // get the first 2 numbers from the stack (our relevant pos and pts)
              var newRecord = [matchingYearLetters[j].form, currentColData[0], currentColData[1]];
              // and add them as a new sub-array in our relevant array
              // cleaner to do with an eval, but Angular doesn't like them
              // switch is the next best way to do this
              switch (currentColHead) {
                case "A":
                  tabA.push(newRecord);
                  break;
                case "B":
                  tabB.push(newRecord);
                  break;
                case "C":
                  tabC.push(newRecord);
                  break;
                case "RB":
                  tabRB.push(newRecord);
                  break;
                case "TOTAL":
                  tabTOTAL.push(newRecord);
                  break;
              }
              // remove the first two elements of the array for the next j
              currentColData = currentColData.slice(2);
            }
          }
          // parse into JSON and pass to view
          $scope.tabA = _.sortBy(sdParseRes(tabA), "pos");
          $scope.tabB = _.sortBy(sdParseRes(tabB), "pos");
          $scope.tabC = _.sortBy(sdParseRes(tabC), "pos");
          $scope.tabRB = _.sortBy(sdParseRes(tabRB), "pos");
          $scope.tabTOTAL = _.sortBy(sdParseRes(tabTOTAL), "pos");
        }, function(res) {
          // failure
          apiErr(res);
        });
      // === RECORDS ===
      $http.get(sdBuildQuery("y" + $scope.year + "_records!A4:J15", "ROWS", false))
        .then(function(res) {
          // success
          res = sdParseRes(res.data.values);
          // first matching event from this yg's records
          $scope.record = _.where(res, {event: $routeParams.eventID})[0];
          // pluralise the units
          if ($scope.record.standingScore !== 1 || $scope.record.currentScore !== 1) {
            $scope.record.units += "s";
          }
          // remarks
          if ($scope.record.doScore === 0) {
            $scope.record.remarks = "None.";
          } else if ($scope.record.doScore === $rootScope.recordBonusValues.equal) {
            $scope.record.remarks = "🏅 This year, " + $scope.record.currentHolder + " equalled the standing all-time record! " + $rootScope.recordBonusValues.equal + " bonus point(s) awarded to " + $scope.year + $scope.record.currentForm + ".";
          } else if ($scope.record.doScore === $rootScope.recordBonusValues.beat) {
            $scope.record.remarks = "🏆 This year, " + $scope.record.currentHolder + " beat the standing all-time record! " + $rootScope.recordBonusValues.beat + " bonus point(s) awarded to " + $scope.year + $scope.record.currentForm + ".";
          }
        }, function(res) {
          // failure
          apiErr(res);
        });
    }
  });

  sd.controller("forms", function($scope, $http) {
    $http.get(sdBuildQuery("summary!A3:E37", "ROWS", false))
      .then(function(res) {
        // success
        res = sdParseRes(res.data.values);
        $scope.all = res;
        $scope.year7 = _.where(res, {year: 7});
        $scope.year8 = _.where(res, {year: 8});
        $scope.year9 = _.where(res, {year: 9});
        $scope.year10 = _.where(res, {year: 10});
      }, function(res) {
        // failure
        apiErr(res);
      });
  });

  sd.controller("form", function($scope, $http, $routeParams, $location, $rootScope) {
    $scope.matchingForm = _.where($rootScope.forms, {year: parseInt($routeParams.year), form: $routeParams.letter.replace("SLASH", "/")})[0];
    if (_.isEmpty($scope.matchingForm)) {
      $location.path("/404");
    } else {
      // === STATISTICS ===
      $http.get(sdBuildQuery("summary!A3:E37", "ROWS", false))
        .then(function(res) {
          // success
          res = sdParseRes(res.data.values);
          $scope.stats = _.where(res, {year: $scope.matchingForm.year, form: $scope.matchingForm.form})[0];
        }, function(res) {
          // failure
          apiErr(res);
        });
      // === EVENT BREAKDOWN ===
      // (step 1) find the SS rows where this form will be found
      //          forms are in the same order in site arrays as in the SS, and we've already validated the URL
      // get an array of all possible forms in this year group
      var possForms = _.pluck(_.where($rootScope.forms, {year: $scope.matchingForm.year}), "form");
      // find n; where our form is the nth row in the SS
      var position = _.indexOf(possForms, $scope.matchingForm.form);
      // convert to a row number: *2 because each form takes two rows; +9 initial offset from top of sheet
      position = (2 * position) + 8;
      // request
      var ssRange = "y" + $scope.matchingForm.year + "_results!D" + position + ":BF" + (position + 1);
      $http.get(sdBuildQuery(ssRange, "COLUMNS", false))
        .then(function(res) {
          // success
          // (step 2) array -> JSON
          var dataset = res.data;
          // add headers as first row of all arrays, ready for JSON parsing
          var results = [["eventDb", "eventPretty", "posA", "ptsA", "posB", "ptsB", "posC", "ptsC", "ptsRB", "ptsTOTAL"]];
          // for every event
          for (var i = 0; i < $rootScope.events.length; i++) {
            // make up the new line from the SS
            // the first 5 arrays are the columns for this event (A, B, C, RB, TOTAL)
            // consider the [0][1], etc. as relative Y, X co-ords within an SS form event 'block'
            var newLine = [
              $rootScope.events[i].db,
              $rootScope.events[i].pretty,
              dataset.values[0][0], // posA
              dataset.values[0][1], // ptsA
              dataset.values[1][0], // posB
              dataset.values[1][1], // ptsB
              dataset.values[2][0], // posC
              dataset.values[2][1], // ptsC
              dataset.values[3][1], // ptsRB
              dataset.values[4][1] // ptsTOTAL
            ];
            results.push(newLine);
            // remove the first 5 arrays from the stack ready for the next i
            dataset.values = dataset.values.slice(5);
          }
          $scope.results = sdParseRes(results);
        }, function(res) {
          // failure
          apiErr(res);
        });
    }
  });

  sd.controller("records", function($scope, $http, $routeParams, $location, $rootScope) {
    var matchingYear = _.contains($rootScope.possYears, $routeParams.year);
    if ($routeParams.year == null) {
      $location.path("/records/" + $rootScope.possYears[0]);
    } else if (!matchingYear) {
      $location.path("/404");
    } else {
      $scope.year = $routeParams.year;
      // === STATS ===
      $http.get(sdBuildQuery("records_summary!A3:C8", "ROWS", false))
        .then(function(res) {
          // success
          $scope.stats = sdParseRes(res.data.values);
        }, function(res) {
          // failure
          apiErr(res);
        });
      // === DETAILS ===
      $http.get(sdBuildQuery("y" + $scope.year + "_records!A4:J15", "ROWS", false))
        .then(function(res) {
          // success
          $scope.details = sdParseRes(res.data.values);
          for (var i = 0; i < $scope.details.length; i++) {
            // pluralise units
            if ($scope.details[i].standingScore !== 1 || $scope.details[i].currentScore !== 1) {
              $scope.details[i].units += "s";
            }
            // get the event nice name
            $scope.details[i].prettyEvent = _.where($rootScope.events, {db: $scope.details[i].event})[0].pretty;
            // set the remark
            if ($scope.details[i].doScore === $rootScope.recordBonusValues.beat) {
              $scope.details[i].remark = "🏆 New all-time record!";
            } else if ($scope.details[i].doScore === $rootScope.recordBonusValues.equal) {
              $scope.details[i].remark = "🏅 All-time record equalled!";
            } else {
              $scope.details[i].remark = "None.";
            }
          }
        }, function(res) {
          // failure
          apiErr(res);
        });
    }
  });

  sd.controller("office", function($scope, $rootScope, $location) {
    var generatedTrack = [];
    var generatedField = [];

    $scope.genTables = false;
    $scope.genStage = 1;

    $scope.stage1end = function() {
      $scope.thisEvents = $rootScope.events;
      $scope.thisForms = $rootScope.forms;
      if ($scope.thisEvents == null || $scope.thisForms == null) {
        swal(
          {
            title: "Error! The data isn't ready yet!",
            text: "The website hasn't loaded the necessary data yet. Please try again in a few moments.",
            icon: "error",
            button: "Dismiss"
          }
        );
      } else {
        for (var i = 0; i < $scope.thisEvents.length; i++) {
          switch($scope.thisEvents[i].units) {
            case "second":
              $scope.thisEvents[i].type = "Track";
              break;
            case "metre":
              $scope.thisEvents[i].type = "Field";
              break;
            default:
              break;
          }
        }
        // generate an array of possible year groups from data
        $scope.thisYears = [];
        for (var i = 0; i < $scope.thisForms.length; i++) {
          if (!$scope.thisYears.includes($scope.thisForms[i].year)) {
            $scope.thisYears.push($scope.thisForms[i].year);
          }
        }
        $scope.genTables = true;
        $scope.genStage = 2;
      }
    };

    $scope.stage2end = function() {
      var seq = 0;
      // for each event
      for (var i = 0; i < $scope.thisEvents.length; i++) {
        // for each year
        for (var j = 0; j < $scope.thisYears.length; j++) {
          // get the forms which could be in this year
          var possForms = _.where($scope.thisForms, {year: $scope.thisYears[j]});
          // see how many sub-events we need to generate
          var subs;
          switch($scope.thisEvents[i].subs) {
            case "a":
              subs = ["A"];
              break;
            case "b":
              subs = ["A", "B"];
              break;
            case "c":
              subs = ["A", "B", "C"];
              break;
            default:
              break;
          }
          // for each sub-event
          for (var k = 0; k < subs.length; k++) {
            // increment seq
            seq += 1;
            // generate the record
            var record = {
              event: $scope.thisEvents[i].pretty,
              subevent: subs[k],
              yearGp: $scope.thisYears[j],
              form1: possForms[0].year + possForms[0].form,
              form2: possForms[1].year + possForms[1].form,
              form3: possForms[2].year + possForms[2].form,
              form4: possForms[3].year + possForms[3].form,
              form5: possForms[4].year + possForms[4].form,
              form6: possForms[5].year + possForms[5].form,
              form7: possForms[6].year + possForms[6].form,
              form8: possForms[7].year + possForms[7].form,
              seq: seq
            };
            if (possForms[8]) {
              record.form9 = possForms[8].year + possForms[8].form;
            }
            // append to the relevant array
            if ($scope.thisEvents[i].type === "Field") {
              generatedField.push(record);
            }
            if ($scope.thisEvents[i].type === "Track") {
              generatedTrack.push(record);
            }
          }
        }
      }
      $scope.genStage = 3;
    };

    $scope.stage3csv = function(type) {
      var csvContent;
      var csvName;
      if (type === "Track") {
        csvContent = Papa.unparse(generatedTrack);
        csvName = "reporting_track_data.csv";
      }
      if (type === "Field") {
        csvContent = Papa.unparse(generatedField);
        csvName = "reporting_field_data.csv";
      }
      download(csvContent, csvName, "text/csv");
    };

    $scope.stage3pdf = function() {
      var doc = new jsPDF({
        orientation: "landscape"
      });
      doc.setFontSize(18);
      doc.text("MGS Sports Day Results Tracking", 14, 14);
      // gen. rows
      var bodyRows = [];
      for (var i = 0; i < generatedField.length; i++) {
        bodyRows.push([generatedField[i].seq, generatedField[i].event, generatedField[i].subevent, generatedField[i].yearGp, "", "", "", ""]);
      }
      for (var i = 0; i < generatedTrack.length; i++) {
        bodyRows.push([generatedTrack[i].seq, generatedTrack[i].event, generatedTrack[i].subevent, generatedTrack[i].yearGp, "", "", "", ""]);
      }
      bodyRows = _.sortBy(bodyRows, "seq");
      doc.autoTable({
        head: [["Seq", "Event", "Sub", "Yr Gp", "Recv?", "Res?", "Rec?", "Notes"]],
        body: bodyRows,
        columnStyles: {
          0: {cellWidth: 25},
          1: {cellWidth: 35},
          2: {cellWidth: 25},
          3: {cellWidth: 25},
          4: {cellWidth: 25},
          5: {cellWidth: 25},
          6: {cellWidth: 25},
          7: {cellWidth: 80}
        },
        bodyStyles: {
          fontSize: 15,
          minCellHeight: 20
        },
        headStyles: {
          fontSize: 17,
          minCellHeight: 17
        },
        styles: {
          lineWidth: 0.2,
          lineColor: 0
        },
        theme: "plain",
        rowPageBreak: "avoid",
        startY: 30
      });
      doc.save("reporting_all_tracking.pdf");
    };

    $scope.restart = function() {
      var generatedTrack = [];
      var generatedField = [];
      $scope.genTables = false;
      $scope.genStage = 1;
    };

  });

}());
