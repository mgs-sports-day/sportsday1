/* jshint esversion:6*/
// MGS Sports Day Website
// https://github.com/tti0/sportsday

(function() {
  "use strict";
  var sd = angular.module("sdApp", ["ngRoute", "ngAnimate", "angular-google-analytics", "angular-loading-bar"]);

  // constants for API reqs
  var apiKey = "AIzaSyCFfbIjKZGPkuXnYUFD4E14flZNKMC9rQE";
  var sheetId = "1mBkkvKhAXKl5vokNVcECTmSBlPuHoXAPaodWLpK-HHc";

  // swal settings to use if an API call fails
  var apiErrSwal = {
    title: "Error! The API call failed!",
    text: "The website couldn't retrieve the data from the results spreadsheet.\nTry refreshing your web browser, or waiting a minute, and then refreshing. If this does not resolve the issue, please report it to the developers. Debug information is in the console.",
    icon: "error",
    button: "Dismiss"
  };

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
    var headers = res.values[0];
    var dataset = res.values.slice(1);
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
   * Safely insert an index of an object without throwing an error
   * @param {object} object - The object to insert from
   * @param {string} item - The item to get from the object
   * @returns {*} - Null or the requested item
   */
  function safeInsert(object, item){
      if(object != null){
          if(object.hasOwnProperty(item)){
              return object[item];
          } else {
              return null;
          }
      } else {
          return null;
      }
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

  // set up AngularJS routes
  sd.config(function($routeProvider) {
    $routeProvider
      .when("/", {
        templateUrl: "views/home.htm",
        controller: "home"
      })
      .when("/events", {
        templateUrl: "views/events.htm",
        controller: "events"
      })
      .when("/e/:eventID/:year?", {
        // year is optional to allow handling of a null redirection
        templateUrl: "views/event.htm",
        controller: "event"
      })
      .when("/forms", {
        templateUrl: "views/forms.htm",
        controller: "forms"
      })
      .when("/f/:formID", {
        templateUrl: "views/form.htm",
        controller: "form"
      })
      .when("/about", {
        templateUrl: "views/about.htm",
        controller: "about"
      })
      .when("/404", {
        templateUrl: "views/404.htm",
        controller: "404"
      })
      .when("/survey", {
        templateUrl: "views/survey.htm",
        controller: "survey"
      })
      .otherwise({
        redirectTo: "/404"
      });
  });

  // Enable only loading bar, not spinner
  sd.config(["cfpLoadingBarProvider", function(cfpLoadingBarProvider) {
    cfpLoadingBarProvider.includeSpinner = false;
  }]);

  // Setup GA
  sd.config(["AnalyticsProvider", function(AnalyticsProvider) {
    AnalyticsProvider.setAccount("UA-117967802-1");
    AnalyticsProvider.trackPages(true);
  }]).run(["Analytics", function(Analytics) {}]);

  // Runs on all views to:
  //  (1) Load the events table
  //  (2) Check if we need to enable the refresh timer
  //  (3) Check if we need to show the survey alert
  sd.controller("global", function($rootScope, $location, $scope, $http) {
    setCookie("stopSurveyAlert", false, 0.5); // cookie to store if user wants survey -- 0.5 of a day = 12 hours
    $rootScope.pagesCount = 0; // set initially to 0
    $http.get(sdBuildQuery("event_list!A2:F13", "ROWS", false))
      .then(function(res) {
        // success
        res = sdParseRes(res.data);
        $rootScope.events = res;
        $scope.$on("$routeChangeStart", function($event, next) {
          if (next.controller === "events" || next.controller === "survey" || next.controller === "about" || next.controller === "404") {
            $rootScope.timerEnabled = false;
          } else {
            $rootScope.timerEnabled = true;
          }
          $rootScope.pagesCount += 1;
          if ($rootScope.pagesCount > 10) {
            if (getCookie("stopSurveyAlert") === "false") {
              swal({
                title: "How are you finding the site?",
                text: "To aid in their work on the site, the developers have created a survey, to gauge user experience. Would you like to take this survey (it should only take 5 minutes)?",
                buttons: ["No", "Yes"],
              })
              .then((response) => {
                if (response) { // if we get a true back from the alert window (i.e. user clicked "Yes")
                  $location.path("/survey");
                  setCookie("stopSurveyAlert", true, 0.5);
                } else {
                  swal("OK, no problem. We won't ask you again.");
                  setCookie('stopSurveyAlert', true, 0.5);
                }
              });
            }
          }
        });
      }, function(res) {
        // failure
        swal(apiErrSwal);
        console.log("API call failure debug @ " + new Date());
        console.log(res);
      });
  });

  // refresh timer code
  sd.controller("timer", function($scope, $route, $interval, $rootScope) {
    $scope.time = 120;
    $scope.plural = "s";
    $scope.$on("$routeChangeStart", function() {
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

  sd.controller("survey", function() {
    // Empty controller, but has to exist for timer disable.
  });

  sd.controller("about", function() {
    // Empty controller, but has to exist for timer disable.
  });

  sd.controller("404", function() {
    // Empty controller, but has to exist for timer disable.
  });

  sd.controller("home", function($scope, $http) {
    $http.get(sdBuildQuery("summary!A3:E35", "ROWS", false))
      .then(function(res) {
        // success
        res = sdParseRes(res.data);
        res = _.sortBy(res, "schoolPos");
        $scope.topfive = res.slice(0, 5);
        $scope.all = res;
      }, function(res) {
        // failure
        swal(apiErrSwal);
        console.log("API call failure debug @ " + new Date());
        console.log(res);
      });
  });

  sd.controller("events", function() {
    // Empty controller, but has to exist for timer disable.
    // View gets events from $rootScope
  });

  sd.directive("eventTable", function() {
    return {
      scope: {subevent: "@"},
      template: // TODO: Fix ABC array selection on @ here
        `
        <div class="table-responsive">
          <table class="table table-striped">
            <thead>
              <tr>
                <th colspan="3">Event {{ subevent }}</th>
              </tr>
              <tr>
                <th>Position</th>
                <th>Form</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              <tr ng-repeat="i in eventScores.subevent" ng-class="{ 'c-gold': score.data.position == 1, 'c-silver': score.data.position == 2,'c-bronze': score.data.position == 3 }">
                <td><strong>{{ i.pos }}</strong></td>
                <td>
                    <a ng-href="#!/f/{{ i.form('/', 'SLASH') }}">{{ i.form }}</a>
                </td>
                <td>{{ i.pts }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `
    };
  });

  sd.controller("event", function($scope, $http, $routeParams, $location, $rootScope) {
    // set event name based on route request
    $scope.possYears = ["7", "8", "9", "10"];
    var matchingEvent = _.where($rootScope.events, {db: $routeParams.eventID});
    var matchingYear = _.contains($scope.possYears, $routeParams.year);
    if (_.isEmpty(matchingEvent)) {
      $location.path("/404");
    } else if ($routeParams.year == null) {
      // we need to get the event first
      $location.path("/e/" + matchingEvent[0].db + "/7");
    } else if (!matchingYear) {
      $location.path("/404");
    } else {
      $scope.year = $routeParams.year;
      $scope.eventDetails = matchingEvent[0];
      /*$http.get(sdBuildQuery("y7_results!D6:H24", "ROWS", false))
        .then(function(res) {
          // success
          res = sdParseRes(res.data);
          console.log(res);
          $scope.eventDetails = matchingEvent[0];
        }, function(res) {
          // failure
          swal(apiErrSwal);
          console.log("API call failure debug @ " + new Date());
          console.log(res);
        });*/
    }
/*

    // query prelim
    var cr = c.t.d[eventName];


    $scope.yearGroups = [7, 8, 9, 10];

    var gets = [cr.a.pos, cr.a.pts, cr.a.name, cr.b.pos, cr.b.pts, cr.c.pos, cr.c.pts];
    var query = "select #year#, #form#, " + gets.join(",");

    $scope.yearGroupData = {};

    $http.get(sdBuildQuery(query, c.baseURL))
      .then(function(res) {
        res = sdParseRes(res.data);
        $scope.yearGroupData.year7 = res.table.rows.slice(0, 8);
        $scope.yearGroupData.year8 = res.table.rows.slice(8, 16);
        $scope.yearGroupData.year9 = res.table.rows.slice(16, 24);
        $scope.yearGroupData.year10 = res.table.rows.slice(24, 33); //year 10 has 9 forms, not 8

        $scope.compiledData = { year7: [], year8: [], year9: [], year10: [] };

        for(let i in $scope.yearGroupData){
          $scope.compiledData[i].eventA = [];
          $scope.compiledData[i].eventB = [];
          $scope.compiledData[i].eventC = [];

          for(var b in $scope.yearGroupData[i]){
            var ygData = $scope.yearGroupData[i][b].c;

            $scope.yearGroupData[i][b].form = ygData[0].f + ygData[1].v;

            if($scope.eventABC){
              $scope.yearGroupData[i][b].eventA = {
                  position: safeInsert(ygData[2], "f"),
                  score: safeInsert(ygData[3], "v"),
                  competitor: safeInsert(ygData[4], "v")
              };

              $scope.yearGroupData[i][b].eventB = {
                  position: safeInsert(ygData[5], "f"),
                  score: safeInsert(ygData[6], "v")
              };

              $scope.yearGroupData[i][b].eventC = {
                  position: safeInsert(ygData[7], "f"),
                  score: safeInsert(ygData[8], "v")
              };
            }else if($scope.eventAB) {
                $scope.yearGroupData[i][b].eventA = {
                    position: safeInsert(ygData[2], "f"),
                    score: safeInsert(ygData[3], "v"),
                    competitor: safeInsert(ygData[4], "v")
                };

                $scope.yearGroupData[i][b].eventB = {
                    position: safeInsert(ygData[5], "f"),
                    score: safeInsert(ygData[6], "v")
                }
            }else if($scope.eventA){
                $scope.yearGroupData[i][b].eventA = {
                    position: safeInsert(ygData[2], "f"),
                    score: safeInsert(ygData[3], "v"),
                    competitor: safeInsert(ygData[4], "v")
                }
            }

            $scope.compiledData[i].eventA.push({
              form: $scope.yearGroupData[i][b].form,
              data: $scope.yearGroupData[i][b].eventA
            });
            $scope.compiledData[i].eventB.push({
              form: $scope.yearGroupData[i][b].form,
              data: $scope.yearGroupData[i][b].eventB
            });
            $scope.compiledData[i].eventC.push({
              form: $scope.yearGroupData[i][b].form,
              data: $scope.yearGroupData[i][b].eventC
            });
          }

          for(let event in $scope.compiledData[i]){
              $scope.compiledData[i][event].sort((a, b) => {
                  if(a.data && b.data){
                      return b.data.score - a.data.score;
                  }
              });
          }
        }

      });*/
  });

  sd.controller('forms', function($scope, $http) {
    $http.get(sdBuildQuery("select #year#, #form#, #total#, #schoolpos#, #yearpos#, #combined#", c.baseURL))
      .then(function(res) {
        res = sdParseRes(res.data);
        $scope.forms = res.table.rows;
        $scope.year7 = res.table.rows.slice(0, 8);
        $scope.year8 = res.table.rows.slice(8, 16);
        $scope.year9 = res.table.rows.slice(16, 24);
        $scope.year10 = res.table.rows.slice(24, 33); //year 10 has 9 forms, not 8
      });
  });

  sd.controller('form', function($scope, $http, $routeParams) {
    var formName = $routeParams.formID.replace('SLASH', '/');
    $scope.formName = formName;
    var query = "select * where #combined# = '" + formName + "'";
    $http.get(sdBuildQuery(query, c.baseURL))
      .then(function(res) {
        res = sdParseRes(res.data);
        $scope.form = res.table.rows;
        var formEvents = {};
        for (var i = 0; i < res.table.cols.length; i++) {
          if (/(.*)(_)([^_]*)(_)(.*)/.test(res.table.cols[i].label)) {
            var col = res.table.cols[i].label;
            col = col.split("_");
            var colCat = col[0];
            if (!formEvents[colCat]) {
              formEvents[colCat] = {
                name: sdPrettifyNameSpecial(colCat),
                sem_name: sdPrettifyNameSem(colCat)
              };
            }
            if (res.table.rows[0].c[i] === null) {
              res.table.rows[0].c[i] = {
                v: ""
              };
            }
            var name = col[1] + col[2];
            formEvents[colCat][name] = res.table.rows[0].c[i].f || res.table.rows[0].c[i].v;
          }
        }
        $scope.formEvents = formEvents;
      });
  });

}());
