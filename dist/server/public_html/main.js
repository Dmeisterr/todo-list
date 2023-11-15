"use strict";
// public_html/main.ts
let currentListId = null;
function setupListEventListeners() {
    document.querySelectorAll('#lists li').forEach(listItem => {
        listItem.addEventListener('click', function () {
            const listId = this.getAttribute('data-list-id');
            console.log("Clicked list ID:", listId);
            if (listId !== null) {
                currentListId = listId;
                fetchTasksForList(listId);
            }
            else {
                console.error('List ID is null');
            }
        });
    });
}
async function fetchTasksForList(listId) {
    try {
        const response = await fetch(`/api/lists/${listId}/tasks`);
        const tasks = await response.json();
        updateTaskListDisplay(tasks);
    }
    catch (error) {
        console.error("Failed to fetch tasks for list:", error);
    }
}
function updateTaskListDisplay(tasks) {
    const tasksContainer = document.querySelector('#tasks');
    if (tasksContainer != null) {
        tasksContainer.innerHTML = '';
        tasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.textContent = task.taskName;
            tasksContainer.appendChild(taskItem);
        });
    }
}
// handles adding a single list item to the display
function addListToDisplay(list) {
    const listsContainer = document.getElementById('lists');
    const listItem = document.createElement('li');
    if (list.listName !== null)
        listItem.innerText = list.listName;
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
        if (listsContainer != null)
            listsContainer.innerHTML = '';
        lists.forEach(addListToDisplay);
        // Check if there is at least one list and fetch tasks for the first one
        if (lists.length > 0) {
            currentListId = lists[0].listId;
            if (currentListId !== null) {
                fetchTasksForList(currentListId);
            }
        }
    }
    catch (error) {
        console.error("Failed to fetch lists:", error);
    }
}
// adds a task to current list
async function addTask() {
    if (currentListId === null) {
        alert("Please select a list first!");
        return;
    }
    const taskTextInput = document.getElementById('new-task-text');
    const taskDeadlineInput = document.getElementById('task-deadline');
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
    }
    catch (error) {
        console.error("Failed to add task:", error);
    }
}
// Function to add a new list
async function addList() {
    const listTextInput = document.getElementById('new-list-text');
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
    }
    catch (error) {
        console.error("Failed to add list:", error);
    }
}
const listButton = document.getElementById('listButton');
if (listButton) {
    listButton.addEventListener('click', addList);
}
else {
    console.error("List button not found");
}
window.addEventListener('load', fetchAndDisplayLists);
const taskButton = document.getElementById('taskButton');
if (taskButton) {
    taskButton.addEventListener('click', addTask);
}
else {
    console.error("Task button not found");
}
