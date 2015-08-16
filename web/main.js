requirejs(["jinaga"], function(Jinaga) {
  var j = new Jinaga();

  var chores = {
    name: "Chores"
  };

  var trash = {
    list: chores,
    description: "Take out the trash"
  };

  function tasksInList(l) {
    return {
      list: l
    };
  }

  function taskAdded(task) {
    var list = document.getElementById('taskList');
    var item = document.createElement('li');
    item.innerText = task.description;
    list.appendChild(item);
  }

  window.j = j;

  j.query(chores, [tasksInList], taskAdded);
  j.fact(trash);
});
