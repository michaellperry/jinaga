require.config({
  paths: {
    lodash: "../bower_components/lodash/lodash"
  }
});

requirejs(["jinaga"], function(Jinaga) {
  var j = new Jinaga();

  function meetingAdded(meeting) {
    var container = document.getElementById('container');
    var item = document.createElement('div');
    var name = document.createElement('p');
    var time = document.createElement('p');
    var location = document.createElement('p');
    item.className = "meeting";
    name.className = "name";
    time.className = "time";
    location.className = "location";
    name.innerText = meeting.name;
    time.innerText = meeting.time;
    location.innerText = meeting.location;
    item.appendChild(name);
    item.appendChild(time);
    item.appendChild(location);
    container.appendChild(item);
  }

  window.j = j;
  window.meetingAdded = meetingAdded;
});
