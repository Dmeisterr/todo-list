// public_html/main.ts
declare var Sortable: any;

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

// -----------------  Login and Registration -----------------
/**
 * logs a user in to the page
 */
function loginUser(): void {
  const userInputElement: HTMLInputElement | null = document.getElementById('username') as HTMLInputElement;
  const passInputElement: HTMLInputElement | null = document.getElementById('password') as HTMLInputElement;

  if (!userInputElement || !passInputElement) {
    alert('Username or password field is missing');
    return;
  }

  const user: string = userInputElement.value;
  const pass: string = passInputElement.value;
  const data: { username: string; password: string } = { username: user, password: pass };

  fetch('/account/login', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  })
    .then((response) => {
      return response.text();
    })
    .then((text) => {
      console.log(text);
      if (text.startsWith('SUCCESS')) {
        alert(text);
        window.location.href = '/index.html';
      } else {
        alert('Login failed');
      }
    })
    .catch((error) => {
      console.error('Error:', error);
    });
}

function addNewUser(): void {
  const url: string = '/add/user/';

  const newUserInputElement: HTMLInputElement | null = document.getElementById('username') as HTMLInputElement;
  const newPassInputElement: HTMLInputElement | null = document.getElementById('password') as HTMLInputElement;

  if (!newUserInputElement || !newPassInputElement) {
    alert('Username or password field is missing');
    return;
  }

  const newUser: string = newUserInputElement.value;
  const newPass: string = newPassInputElement.value;

  const userData: { username: string; password: string; listings: string[]; purchases: string[] } = {
    username: newUser,
    password: newPass,
    listings: [],
    purchases: []
  };

  fetch(url, {
    method: 'POST',
    body: JSON.stringify(userData),
    headers: { 'Content-Type': 'application/json' }
  })
    .then(response => response.text())
    .then(data => alert(data))
    .catch((error) => console.error('Error:', error));
}

// -----------------  Tasks ---------------------------------
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

        // Create and append the check icon
        const svg = new DOMParser().parseFromString(`<svg class="checkIcon" fill="currentColor" width="20" height="20" viewBox="0 0 20 16" xmlns="http://www.w3.org/2000/svg" focusable="false"><path d="M10 3a7 7 0 100 14 7 7 0 000-14zm-8 7a8 8 0 1116 0 8 8 0 01-16 0z" fill="currentColor"></path></svg>`, 'image/svg+xml').documentElement;
        taskItem.appendChild(svg);
        svg.addEventListener('click', () => updateTaskCompletion(task.taskId));
        taskItem.setAttribute('data-task-id', task.taskId);
        // Set the text content of the task item
        taskItem.append(task.taskName);

        // // Create and append the info icon
        // const infoIcon = document.createElement('img');
        // infoIcon.src = './images/info.png';
        // infoIcon.classList.add('infoIcon');
        // taskItem.appendChild(infoIcon);

        const buttonContainer = document.createElement('div');
        buttonContainer.classList.add('button-container');

        // Add Edit button
        const editButton = document.createElement('button');
        editButton.innerText = 'Edit';
        editButton.addEventListener('click', (event) => {
          event.stopPropagation(); // Prevent triggering the list item click event
          editTask(task.taskId);
        });
        buttonContainer.appendChild(editButton);

        // Add Delete button
        const deleteButton = document.createElement('button');
        deleteButton.innerText = 'Delete';
        deleteButton.addEventListener('click', (event) => {
          event.stopPropagation(); // Prevent triggering the list item click event
          deleteTask(task.taskId);
        });
        buttonContainer.appendChild(deleteButton);

        taskItem.appendChild(buttonContainer);

        // Append the task item to the tasks container
        tasksContainer.appendChild(taskItem);
      }
    });
    initializeTasksSortable();

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
      body: JSON.stringify({ isCompleted: true })
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

function initializeTasksSortable() {
  const tasksContainer = document.getElementById('tasks');
  if (tasksContainer) {
    new Sortable(tasksContainer, {
      animation: 150,
      ghostClass: 'blue-background-class',
      onEnd: async function () {
        const orderedTaskIds = Array.from(tasksContainer.children)
          .map(child => child.getAttribute('data-task-id')); //TODO: fix this
        await updateTaskOrder(orderedTaskIds);
      },
    });
  }
}

async function updateTaskOrder(orderedTaskIds: (string | null)[]) {
  try {
    const response = await fetch('/api/tasks/order', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedTaskIds })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Failed to update task order:", error);
  }
}

// -----------------  Lists ---------------------------------
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

  const buttonContainer = document.createElement('div');
  buttonContainer.classList.add('button-container');

  // Add Edit button
  const editButton = document.createElement('button');
  editButton.innerText = 'Edit';
  editButton.addEventListener('click', (event) => {
    event.stopPropagation(); // Prevent triggering the list item click event
    editList(list.listId);
  });
  buttonContainer.appendChild(editButton);

  // Add Delete button
  const deleteButton = document.createElement('button');
  deleteButton.innerText = 'Delete';
  deleteButton.addEventListener('click', (event) => {
    event.stopPropagation(); // Prevent triggering the list item click event
    deleteList(list.listId);
  });
  buttonContainer.appendChild(deleteButton);

  listItem.appendChild(buttonContainer);

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
    initializeSortable();
  } catch (error) {
    console.error("Failed to fetch lists:", error);
  }
}

function initializeSortable() {
  const listsContainer = document.getElementById('lists');
  if (listsContainer) {
    new Sortable(listsContainer, {
      animation: 150,
      ghostClass: 'blue-background-class',
      onEnd: async function () {
        const orderedListIds = Array.from(listsContainer.children)
          .map(child => child.getAttribute('data-list-id'));
        await updateListOrder(orderedListIds);
      },
    });
  }
}

async function updateListOrder(orderedListIds: (string | null)[]) {
  try {
    const response = await fetch('/api/lists/order', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedListIds })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Failed to update list order:", error);
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

// Function to delete a list
async function deleteList(listId: string) {
  if (!confirm("Are you sure you want to delete this list?")) {
    return;
  }

  try {
    const response = await fetch(`/api/lists/${listId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Fetch and update the lists after deletion
    fetchAndDisplayLists();
  } catch (error) {
    console.error("Failed to delete list:", error);
  }
}

// Fucntion to update a list
async function editList(listId: string) {
  const newListName = prompt("Enter new list name:");
  if (newListName === null || newListName.trim() === "") {
    return; // User cancelled the prompt or entered a blank name
  }

  try {
    const response = await fetch(`/api/lists/${listId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ listName: newListName })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Fetch and update the lists after renaming
    fetchAndDisplayLists();
  } catch (error) {
    console.error("Failed to update list name:", error);
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