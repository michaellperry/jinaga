var j = new Jinaga();
j.sync(new JinagaDistributor("ws://localhost:8888/"));

function paragraph(className, innerText) {
  var p = document.createElement('p');
  p.className = className;
  p.innerText = innerText;
  return p;
}

function button(clickHandler) {
  var b = document.createElement('input');
  b.setAttribute("type", "button");
  b.className = "close_button";
  b.value = "x";
  b.addEventListener("click", clickHandler);
  return b;
}

function closeMeeting(meeting) {
  j.fact({
    type: "MeetingOccurred",
    meeting: meeting
  });
}

function meetingAdded(meeting) {
  var container = document.getElementById('container');
  var item = document.createElement('div');
  item.className = "meeting";
  item.appendChild(paragraph("name", meeting.name));
  item.appendChild(paragraph("time", meeting.time));
  item.appendChild(paragraph("location", meeting.location));
  item.appendChild(button(function() { closeMeeting(meeting); }));
  container.appendChild(item);

  return item;
}

function meetingRemoved(meeting, item) {
  var container = document.getElementById('container');
  container.removeChild(item);
}

function futureMeeting(m) {
  m.type = "Meeting";
  return j.not({
    type: "MeetingOccurred",
    meeting: m
  });
}

function meetingsInGroup(g) {
  g.type = "UserGroup";
  return j.where({
    type: "Meeting",
    group: g
  }, [futureMeeting]);
}

var group = {
  type: "UserGroup",
  name: "Papers We Love"
};
j.watch(group, [meetingsInGroup], meetingAdded, meetingRemoved);

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
