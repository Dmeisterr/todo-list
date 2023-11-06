// public_html/main.ts

function setupListEventListeners() {
  document.querySelectorAll('#lists li').forEach(listItem => {
    listItem.addEventListener('click', function(this: HTMLLIElement) {
      const listId = this.getAttribute('data-list-id');
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
    tasksContainer.innerHTML = ''; 

    
    tasks.forEach(task => {
        const taskItem = document.createElement('li');
        taskItem.textContent = task.taskName; 
        tasksContainer.appendChild(taskItem);
    });
  }
}

// handles adding a single list item to the display
function addListToDisplay(list: { listName: string | null; ListID: string }) {
    const listsContainer = document.getElementById('lists');
    const listItem = document.createElement('li');
    if (list.listName !== null) listItem.innerText = list.listName;
    listItem.setAttribute('data-list-id', list.ListID);
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
    } catch (error) {
      console.error("Failed to fetch lists:", error);
    }
  }
  

window.addEventListener('load', fetchAndDisplayLists);

