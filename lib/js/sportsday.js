/* jshint esversion:6*/

// MGS Sports Day Website
// https://github.com/tti0/sportsday

(function(){
  "use strict";
  var sd = angular.module('sdApp',['ngRoute','googlechart']);

  var c = {
    baseURL: "https://docs.google.com/spreadsheets/d/142LTpoXYgJCnx8IB-jBSHyEqPNeo9Z7rDY1h_u3mb-g/gviz/tq?gid=1608509347",
    listURL: "https://docs.google.com/spreadsheets/d/142LTpoXYgJCnx8IB-jBSHyEqPNeo9Z7rDY1h_u3mb-g/gviz/tq?gid=2146682450",
    newsURL: "https://docs.google.com/spreadsheets/d/142LTpoXYgJCnx8IB-jBSHyEqPNeo9Z7rDY1h_u3mb-g/gviz/tq?gid=979864642",
    t:{
      year:"A",
      form:"B",
      total:"C",
      yearpos:"D",
      schoolpos:"E",
      combined:"DL",
      d:{
        long_jump:{
          a:{
            pos:"F",
            pts:"G",
            name:"H"
          },
          b:{
            pos:"I",
            pts:"J",
            name:"K"
          },
          c:{
            pos:"L",
            pts:"M",
            name:"N"
          },
          total:"O"
        },
        high_jump:{
          a:{
            pos:"P",
            pts:"Q",
            name:"R"
          },
          b:{
            pos:"S",
            pts:"T",
            name:"U"
          },
          c:{
            pos:"V",
            pts:"W",
            name:"X"
          },
          total:"Y"
        },
        shot:{
          a:{
            pos:"Z",
            pts:"AA",
            name:"AB"
          },
          b:{
            pos:"AC",
            pts:"AD",
            name:"AE"
          },
          c:{
            pos:"AF",
            pts:"AG",
            name:"AH"
          },
          total:"AI"
        },
        javelin:{
          a:{
            pos:"AJ",
            pts:"AK",
            name:"AL"
          },
          b:{
            pos:"AM",
            pts:"AN",
            name:"AO"
          },
          c:{
            pos:"AP",
            pts:"AQ",
            name:"AR"
          },
          total:"AS"
        },
        "100m":{
          a:{
            pos:"AT",
            pts:"AU",
            name:"AV"
          },
          b:{
            pos:"AW",
            pts:"AX",
            name:"AY"
          },
          c:{
            pos:"AZ",
            pts:"BA",
            name:"BB"
          },
          total:"BC"
        },
        "200m":{
          a:{
            pos:"BD",
            pts:"BE",
            name:"BF"
          },
          b:{
            pos:"BG",
            pts:"BH",
            name:"BI"
          },
          c:{
            pos:"BJ",
            pts:"BK",
            name:"BL"
          },
          total:"BM"
        },
        "300m":{
          a:{
            pos:"BN",
            pts:"BO",
            name:"BP"
          },
          b:{
            pos:"BQ",
            pts:"BR",
            name:"BS"
          },
          c:{
            pos:"BT",
            pts:"BU",
            name:"BV"
          },
          total:"BW"
        },
        "800m":{
          a:{
            pos:"BX",
            pts:"BY",
            name:"BZ"
          },
          b:{
            pos:"CA",
            pts:"CB",
            name:"CC"
          },
          c:{
            pos:"CD",
            pts:"CE",
            name:"CF"
          },
          total:"CG"
        },
        "1500m":{
          a:{
            pos:"CH",
            pts:"CI",
            name:"CJ"
          },
          b:{
            pos:"CK",
            pts:"CL",
            name:"CM"
          },
          c:{
            pos:"CN",
            pts:"CO",
            name:"CP"
          },
          total:"CQ"
        },
        "4x300m":{
          a:{
            pos:"CR",
            pts:"CS",
            name:"CT"
          },
          b:{
            pos:"CU",
            pts:"CV",
            name:"CW"
          },
          c:{
            pos:"CX",
            pts:"CY",
            name:"CZ"
          },
          total:"DA"
        },
        "4x100m":{
          a:{
            pos:"DB",
            pts:"DC",
            name:"DD"
          },
          b:{
            pos:"DE",
            pts:"DF",
            name:"DG"
          },
          c:{
            pos:"DH",
            pts:"DI",
            name:"DJ"
          },
          total:"DK"
        }
      }
    }
  };

  function sdParseRes(res){
    res = res.replace('/*O_o*/\ngoogle.visualization.Query.setResponse(','');
    res = res.slice(0, -2);
    res = JSON.parse(res);
    return res;
  }

  function sdBuildQuery(string,base){
    string = string.replace(/(#)([^#]*)(#)/g, function(s){
      s = s.replace(/#/g,"");
      return eval("c.t."+s);
    });
    string = base + "&tq=" + encodeURIComponent(string);
    return string;
  }

  function sdPrettifyName(string){
    string = string.split("_");
    for(var i = 0; i < string.length; i++){
      string[i] = `${string[i][0].toUpperCase()}${string[i].slice(1)}`;
    }
    string = string.join(" ");
    return string;
  }

  function sdPrettifyNameSem(string){
    switch(string){
      case "longjump":
        return "long_jump";
      case "highjump":
        return "high_jump";
      default:
        return string;
    }
  }

  function sdPrettifyNameSpecial(string){
    switch(string){
      case "longjump":
        return "Long Jump";
      case "highjump":
        return "High Jump";
      case "shot":
        return "Shot";
      case "javelin":
        return "Javelin";
      default:
        return string;
    }
  }

  sd.config(function($routeProvider){
    $routeProvider
    .when("/",{
      templateUrl: "views/home.htm",
      controller: "home"
    })
    .when("/activities",{
      templateUrl: "views/activities.htm",
      controller: "activities"
    })
    .when("/a/:activityID",{
      templateUrl:"views/activity.htm",
      controller: "activity"
    })
    .when("/forms",{
      templateUrl:"views/forms.htm",
      controller:"forms"
    })
    .when("/f/:formID",{
      templateUrl:"views/form.htm",
      controller:"form"
    })
    .when("/newsfeed",{
      templateUrl:"views/newsfeed.htm",
      controller:"newsfeed"
    })
    .when("/insights",{
      templateUrl:"views/insights.htm",
    })
    .when("/i/:insightID",{
      templateUrl:"views/insight.htm",
      controller:"insight"
    })
    .when("/about",{
      templateUrl:"views/about.htm"
    });
  });

  sd.controller('home',function($scope,$http){
    $http.get(sdBuildQuery("select #year#, #form#, #total#, #schoolpos# order by #total# desc",c.baseURL))
    .then(function(res){
      res = sdParseRes(res.data);
      $scope.topfive = res.table.rows.slice(0,5);
      $scope.all = res.table.rows;
    });
  });

  sd.controller('activities',function($scope,$http){
    $http.get(sdBuildQuery("select A, B",c.listURL))
    .then(function(res){
      res = sdParseRes(res.data);
      $scope.activities = res.table.rows;
    });
  });

  sd.controller('activity',function($scope,$http,$routeParams){
    var activityName = $routeParams.activityID;
    $scope.activityName = sdPrettifyName(activityName);
    var cr = c.t.d[activityName];
    var gets = [cr.a.pos,cr.a.pts,cr.a.name,cr.b.pos,cr.b.pts,cr.b.name,cr.c.pos,cr.c.pts,cr.c.name,cr.total];
    var query = "select #year#, #form#, "+gets.join(",")+"";
    $http.get(sdBuildQuery(query,c.baseURL))
    .then(function(res){
      res = sdParseRes(res.data);
      $scope.activities = res.table.rows;
      $scope.year7 = res.table.rows.slice(0,8);
      $scope.year8 = res.table.rows.slice(8,16);
      $scope.year9 = res.table.rows.slice(16,24);
      $scope.year10 = res.table.rows.slice(24,33); //year 10 has 9 forms, not 8
    });
  });

  sd.controller('forms',function($scope,$http){
    $http.get(sdBuildQuery("select #year#, #form#, #total#, #schoolpos#, #yearpos#, #combined#",c.baseURL))
    .then(function(res){
      res = sdParseRes(res.data);
      $scope.forms = res.table.rows;
      $scope.year7 = res.table.rows.slice(0,8);
      $scope.year8 = res.table.rows.slice(8,16);
      $scope.year9 = res.table.rows.slice(16,24);
      $scope.year10 = res.table.rows.slice(24,33); //year 10 has 9 forms, not 8
    });
  });

  sd.controller('form',function($scope,$http,$routeParams){
    var formName = $routeParams.formID.replace('SLASH','/');
    $scope.formName = formName;
    var query = "select * where #combined# = '"+formName+"'";
    $http.get(sdBuildQuery(query,c.baseURL))
    .then(function(res){
      res = sdParseRes(res.data);
      $scope.form = res.table.rows;
      var formActivities = {};
      for(var i = 0; i < res.table.cols.length; i++){
        if(/(.*)(_)([^_]*)(_)(.*)/.test(res.table.cols[i].label)){
          var col = res.table.cols[i].label;
          col = col.split("_");
          var colCat = col[0];
          if(!formActivities[colCat]){
            formActivities[colCat] = {
              name:sdPrettifyNameSpecial(colCat),
              sem_name:sdPrettifyNameSem(colCat)
            };
          }
          if(res.table.rows[0].c[i]===null){
            res.table.rows[0].c[i] = {v:""};
          }
          var name = col[1]+col[2];
          formActivities[colCat][name] = res.table.rows[0].c[i].f || res.table.rows[0].c[i].v;
        }
      }
      $scope.formActivities = formActivities;
    });
  });

  sd.controller('newsfeed',function($scope,$http){
    $http.get(sdBuildQuery("select A, B order by A desc",c.newsURL)) //A is the timestamp, B is the post - plaintext only
    .then(function(res){
      res = sdParseRes(res.data);
      $scope.newsitems = res.table.rows;
    });
  });

  sd.controller("insight",function($scope,$routeParams,$http){
    var insightID = parseInt($routeParams.insightID);
    var chartAreaOptions = {
      left:"5px",
      top:"10%",
      width:"100%",
      height:"500px"
    };
    $scope.insightID = $routeParams.insightID;
    $scope.chartLoading = true;
    switch(insightID){
      case 1:
        $scope.insightName = "Year groups - share of total points";
        $http.get(sdBuildQuery("select #year#,#form#,#total#",c.baseURL))
        .then(function(res){
          res = sdParseRes(res.data);
          var yearGroups = [7,8,9,10];
          var yearGroupTotals = [];
          var filter = {};
          for(var i = 0; i < yearGroups.length; i++){
            filter[yearGroups[i]] = res.table.rows.filter(function(e){
              return e.c[0].v === yearGroups[i];
            });
          }
          for(var b = 0; b < Object.keys(filter).length; b++){
            if(yearGroupTotals[b]===undefined||yearGroupTotals[b]===null){
              yearGroupTotals.push(0);
            }
            for(var x = 0; x < filter[Object.keys(filter)[b]].length; x++){
              yearGroupTotals[b] += filter[Object.keys(filter)[b]][x].c[2].v;
            }
          }
          $scope.chartLoading = false;
          $scope.DChart = {};
          $scope.DChart.type = "PieChart";
          $scope.DChart.data = {
            cols:[
              {
                id:"a",
                label:"Year Group",
                type:"string"
              },
              {
                id:"b",
                label:"Score",
                type:"number"
              }
            ],
            rows:[]
          };
          for(i = 0; i < yearGroups.length; i++){
            $scope.DChart.data.rows.push({
              c:[
                {
                  v:yearGroups[i].toString()
                },
                {
                  v:yearGroupTotals[i]
                }
              ]
            });
          }
          $scope.DChart.options = {
            title:"Year groups - share of total points",
            chartArea: chartAreaOptions
          };
        });
        break;
      case 2:
        $scope.insightName = "Forms - share of total points";
        $http.get(sdBuildQuery("select #combined#,#total# order by #total# desc",c.baseURL))
        .then(function(res){
          res = sdParseRes(res.data);
          $scope.chartLoading = false;
          $scope.DChart = {};
          $scope.DChart.type = "PieChart";
          $scope.DChart.data = res.table;
          $scope.DChart.options = {
            title:"Forms - share of total points",
            chartArea: chartAreaOptions
          };
        });
        break;
      case 3:
        $scope.insightName = "Per Activity";
        $scope.insight3Sport = null;
        $scope.chartLoading = false;
        $scope.update = function(e){
          $scope.chartLoading = true;
          var sport = e.insight3Sport;
          var col = c.t.d[sport].total;
          $http.get(sdBuildQuery("select #combined#,"+col+" order by "+col+" desc",c.baseURL))
          .then(function(res){
            res = sdParseRes(res.data);
            $scope.chartLoading = false;
            $scope.DChart = {};
            $scope.DChart.type = "PieChart";
            $scope.DChart.data = res.table;
            $scope.DChart.options = {
              title:"Form scores in "+sdPrettifyName(sport),
              chartArea:chartAreaOptions
            };
          });
        };
        break;
    }
  });

  sd.controller("timer",function($scope,$route,$interval){
    $scope.time = 60;
    $scope.plural = "s";
    $interval(function(){
      $scope.time--;
      if($scope.time==-1){
        $route.reload();
        $scope.time = 60;
      }
      if($scope.time==1){
        $scope.plural="";
      }else{
        $scope.plural="s";
      }
    },1000);
  });

}());
