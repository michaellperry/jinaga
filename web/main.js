require.config({
  paths: {
    lodash: "../bower_components/lodash/lodash",
    "engine.io-client": "../bower_components/engine.io-client/engine.io",
    "debug": "../bower_components/debug/debug"
  }
});

requirejs(["jinaga", "jinaga.distributor.client"], function(Jinaga, JinagaDistributor) {
  var j = new Jinaga();
  j.sync(new JinagaDistributor("ws://localhost/"));

  function paragraph(className, innerText) {
    var p = document.createElement('p');
    p.className = className;
    p.innerText = innerText;
    return p;
  }

  function meetingAdded(meeting) {
    var container = document.getElementById('container');
    var item = document.createElement('div');
    item.className = "meeting";
    item.appendChild(paragraph("name", meeting.name));
    item.appendChild(paragraph("time", meeting.time));
    item.appendChild(paragraph("location", meeting.location));
    container.appendChild(item);
  }

  function meetingsInGroup(g) {
    g.type = "UserGroup";
    return {
      type: "Meeting",
      group: g
    }
  }

  var group = {
    type: "UserGroup",
    name: "Papers We Love"
  };
  j.watch(group, [meetingsInGroup], meetingAdded);

  window.j = j;
  window.newMeeting = function(name, time, location, groupName) {
    j.fact({
      type: "Meeting",
      group: {
        type: "UserGroup",
        name: groupName || "Papers We Love"
      },
      name: name || "Time, Clocks, and the Ordering of Events in a Distributed System",
      time: time || "April 6",
      location: location || "Improving"
    });
  }
});
