// public_html/main.ts

let currentListId: string | null = null;

function setupListEventListeners() {
  document.querySelectorAll('#lists li').forEach(listItem => {
    listItem.addEventListener('click', function (this: HTMLLIElement) {
      const listId = this.getAttribute('data-list-id');
      console.log("Clicked list ID:", listId);
      if (listId !== null) {
        currentListId = listId;
        fetchTasksForList(listId);
      } else {
        console.error('List ID is null');
      }

    });
  });
}

async function fetchTasksForList(listId: string) {
  try {
    const response = await fetch(`/api/lists/${listId}/tasks`);
    const tasks = await response.json();
    updateTaskListDisplay(tasks);
  } catch (error) {
    console.error("Failed to fetch tasks for list:", error);
  }
}

function updateTaskListDisplay(tasks: any[]) {
  const tasksContainer = document.querySelector('#tasks');
  if (tasksContainer != null) {
    tasksContainer.innerHTML = '';

    tasks.forEach(task => {
      if (!task.isCompleted) {
        const taskItem = document.createElement('li');

        // Create a new element to hold the SVG
        const svg = new DOMParser().parseFromString(`<svg class="checkIcon" fill="currentColor" width="20" height="20" viewBox="0 0 20 16" xmlns="http://www.w3.org/2000/svg" focusable="false"><path d="M10 3a7 7 0 100 14 7 7 0 000-14zm-8 7a8 8 0 1116 0 8 8 0 01-16 0z" fill="currentColor"></path></svg>`, 'image/svg+xml').documentElement;

        // Append SVG to the task item
        taskItem.appendChild(svg);
        console.log(task);
        console.log(task.taskId);
        svg.addEventListener('click', () => updateTaskCompletion(task.taskId));

        // Set the text content of the task item
        taskItem.append(task.taskName);

        // Append the task item to the tasks container
        tasksContainer.appendChild(taskItem);
      }
    });
  }
}


// handles adding a single list item to the display
function addListToDisplay(list: { listName: string | null; listId: string }) {
  const listsContainer = document.getElementById('lists');
  const listItem = document.createElement('li');
  if (list.listName !== null) listItem.innerText = list.listName;
  listItem.setAttribute('data-list-id', list.listId);

  //debugging
  console.log("listID:", list.listId);
  const listId = listItem.getAttribute('data-list-id');
  console.log("Clicked list ID:", listId);

  if (listsContainer != null)
    listsContainer.appendChild(listItem);
  setupListEventListeners();

}

// fetches and displays all lists
async function fetchAndDisplayLists() {
  try {
    const response = await fetch('/api/lists');
    const lists = await response.json();
    const listsContainer = document.getElementById('lists');
    if (listsContainer != null) listsContainer.innerHTML = '';
    lists.forEach(addListToDisplay);

    // Check if there is at least one list and fetch tasks for the first one
    if (lists.length > 0) {
      currentListId = lists[0].listId;
      if (currentListId !== null) {
        fetchTasksForList(currentListId);
      }
    }
  } catch (error) {
    console.error("Failed to fetch lists:", error);
  }
}

async function updateTaskCompletion(taskId: string) {
  if (!currentListId) {
    console.error("No list selected");
    return;
  }

  try {
    const response = await fetch(`/api/todo/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isCompleted: true })  // Assuming other fields are handled on the server or are not required
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Fetch and update the tasks list after updating the task
    fetchTasksForList(currentListId);
  } catch (error) {
    console.error("Failed to update task:", error);
  }
}


// adds a task to current list
async function addTask() {
  if (currentListId === null) {
    alert("Please select a list first!");
    return;
  }

  const taskTextInput = document.getElementById('new-task-text') as HTMLInputElement;
  const taskDeadlineInput = document.getElementById('task-deadline') as HTMLInputElement;

  if (!taskTextInput || !taskDeadlineInput) {
    console.error("Task text or deadline input not found");
    return;
  }

  const taskText = taskTextInput.value;
  const taskDeadline = taskDeadlineInput.value;

  if (!taskText) {
    alert("Please enter a task name.");
    return;
  }

  // Prepare the task data
  const taskData = {
    taskName: taskText,
    deadline: taskDeadline,
    listId: currentListId
  };

  try {
    const response = await fetch('/api/lists/' + currentListId + '/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Clear the input fields after successful addition
    taskTextInput.value = '';
    taskDeadlineInput.value = '';

    // Fetch and update the tasks list
    fetchTasksForList(currentListId);

  } catch (error) {
    console.error("Failed to add task:", error);
  }
}

// Function to add a new list
async function addList() {
  const listTextInput = document.getElementById('new-list-text') as HTMLInputElement;
  if (!listTextInput) {
    console.error("List text input not found");
    return;
  }

  const listName = listTextInput.value;
  if (!listName) {
    alert("Please enter a list name.");
    return;
  }

  try {
    const response = await fetch('/api/lists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ listName })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Clear the input field after successful addition
    listTextInput.value = '';

    // Fetch and update the lists
    fetchAndDisplayLists();

  } catch (error) {
    console.error("Failed to add list:", error);
  }
}


window.addEventListener('load', fetchAndDisplayLists);

const listButton = document.getElementById('listButton');
if (listButton) {
  listButton.addEventListener('click', addList);
} else {
  console.error("List button not found");
}

const taskButton = document.getElementById('taskButton');
if (taskButton) {
  taskButton.addEventListener('click', addTask);
} else {
  console.error("Task button not found");
}
