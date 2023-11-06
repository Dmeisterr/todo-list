// public_html/main.ts

// Assuming you have a function to set up event listeners
function setupListEventListeners() {
  document.querySelectorAll('#lists li').forEach(listItem => {
    listItem.addEventListener('click', function(this: HTMLLIElement) {
      const listId = this.getAttribute('data-list-id'); // Assuming you have a data attribute for list IDs
      if (listId !== null) {
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
  if (tasksContainer != null){
    tasksContainer.innerHTML = ''; // Clear current tasks

    // Add new tasks to the list
    tasks.forEach(task => {
        const taskItem = document.createElement('li');
        taskItem.textContent = task.taskName; // Simplified, you'd probably want to include more details
        tasksContainer.appendChild(taskItem);
    });
  }
}

// This function handles adding a single list item to the display
function addListToDisplay(list: { listName: string | null; ListID: string }) {
    const listsContainer = document.getElementById('lists');
    const listItem = document.createElement('li');
    if (list.listName !== null) listItem.innerText = list.listName;
    listItem.setAttribute('data-list-id', list.ListID);
    if (listsContainer != null) 
      listsContainer.appendChild(listItem);
    setupListEventListeners(); // Set up event listener for the new list item
    
  }
  
  // This function fetches and displays all lists
  async function fetchAndDisplayLists() {
    try {
      const response = await fetch('/api/lists');
      const lists = await response.json();
      const listsContainer = document.getElementById('lists');
      if (listsContainer != null) listsContainer.innerHTML = ''; // Clear the current list
      lists.forEach(addListToDisplay); // Add each list to the display
    } catch (error) {
      console.error("Failed to fetch lists:", error);
    }
  }
  
// Call this function when the window loads
window.addEventListener('load', fetchAndDisplayLists);

