const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { format, isValid, toDate } = require("date-fns");

const app = express();
app.use(express.json());

let dbPath = path.join(__dirname, "todoApplication.db");
let database = null;

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertDBObjectToResponseTodo = (DBObject) => {
  return {
    id: DBObject.id,
    todo: DBObject.todo,
    priority: DBObject.priority,
    category: DBObject.category,
    status: DBObject.status,
    dueDate: DBObject.due_date,
  };
};

const inValidScenarioStatus = (status) => {
  const s = status.toUpperCase();
  const statuses = ["", "TO DO", "IN PROGRESS", "DONE"];
  if (statuses.includes(s)) {
    return true;
  }
  return false;
};

const inValidScenarioPriority = (priority) => {
  const s = priority.toUpperCase();
  const priorities = ["", "HIGH", "MEDIUM", "LOW"];
  if (priorities.includes(s)) {
    return true;
  }
  return false;
};

const inValidScenarioCategory = (category) => {
  const s = category.toUpperCase();
  const categories = ["", "WORK", "HOME", "LEARNING"];
  if (categories.includes(s)) {
    return true;
  }
  return false;
};

// API-1 Get TODOS
app.get("/todos/", async (request, response) => {
  const {
    category = "",
    priority = "",
    status = "",
    search_q = "",
  } = request.query;
  if (inValidScenarioCategory(category)) {
    if (inValidScenarioPriority(priority)) {
      if (inValidScenarioStatus(status)) {
        const getTodosQuery = `
        SELECT * FROM todo 
        WHERE
            todo LIKE "%${search_q}%" AND
            priority LIKE "%${priority}%" AND
            status LIKE "%${status}%" AND
            category LIKE "%${category}%";
    `;
        const todosArr = await database.all(getTodosQuery);
        response.send(
          todosArr.map((eachTodo) => convertDBObjectToResponseTodo(eachTodo))
        );
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else {
    response.status(400);
    response.send("Invalid Todo Category");
  }
});

// API-2 Get TODO by Todo ID
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `SELECT * FROM todo WHERE id=${todoId};`;
  const todoObject = await database.get(getTodoQuery);
  response.send(convertDBObjectToResponseTodo(todoObject));
});

// API-3 Get Agenda
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const parts = date.split("-");
  if (parts[1] > 12) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const mydate = toDate(new Date(parts[0], parts[1] - 1, parts[2]));
    if (isValid(mydate)) {
      const getTodosByDate = `
        SELECT * FROM todo
        WHERE due_date = strftime("%Y-%m-%d",'${format(mydate, "yyyy-MM-dd")}');
      `;
      const todosArray = await database.all(getTodosByDate);
      response.send(
        todosArray.map((eachTodo) => convertDBObjectToResponseTodo(eachTodo))
      );
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
});

// API-4 Insert TODO
app.post("/todos/", async (request, response) => {
  let { id, todo, priority, status, category, dueDate } = request.body;
  priority = priority.toUpperCase();
  status = status.toUpperCase();
  category = category.toUpperCase();
  if (inValidScenarioCategory(category)) {
    if (inValidScenarioPriority(priority)) {
      if (inValidScenarioStatus(status)) {
        const parts = dueDate.split("-");
        if (parts[1] > 12) {
          response.status(400);
          response.send("Invalid Due Date");
        } else {
          const mydate = toDate(new Date(parts[0], parts[1] - 1, parts[2]));
          if (isValid(mydate)) {
            const insertTodoQuery = `
                INSERT INTO 
                    todo
                VALUES 
                    (${id},'${todo}','${priority}','${status}','${category}',strftime("%Y-%m-%d",'${format(
              mydate,
              "yyyy-MM-dd"
            )}'));
      `;
            await database.run(insertTodoQuery);
            response.send("Todo Successfully Added");
          } else {
            response.status(400);
            response.send("Invalid Due Date");
          }
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else {
    response.status(400);
    response.send("Invalid Todo Category");
  }
});

// API-5 Update TODO
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let { status, priority, todo, category, dueDate } = request.body;
  let updateQuery;
  if (status !== undefined) {
    status = status.toUpperCase();
    if (inValidScenarioStatus(status)) {
      updateQuery = `UPDATE todo SET status='${status}' WHERE id=${todoId}`;
      await database.run(updateQuery);
      response.send("Status Updated");
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else if (priority !== undefined) {
    priority = priority.toUpperCase();
    if (inValidScenarioPriority(priority)) {
      updateQuery = `UPDATE todo SET priority='${priority}' WHERE id=${todoId}`;
      await database.run(updateQuery);
      response.send("Priority Updated");
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else if (todo !== undefined) {
    updateQuery = `UPDATE todo SET todo='${todo}' WHERE id=${todoId}`;
    await database.run(updateQuery);
    response.send("Todo Updated");
  } else if (category !== undefined) {
    category = category.toUpperCase();
    if (inValidScenarioCategory(category)) {
      updateQuery = `UPDATE todo SET category='${category}' WHERE id=${todoId}`;
      await database.run(updateQuery);
      response.send("Category Updated");
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
    }
  } else {
    const parts = dueDate.split("-");
    if (parts[1] > 12) {
      response.status(400);
      response.send("Invalid Due Date");
    } else {
      const mydate = toDate(new Date(parts[0], parts[1] - 1, parts[2]));
      if (isValid(mydate)) {
        updateQuery = `UPDATE todo SET due_date=strftime("%Y-%m-%d",'${format(
          mydate,
          "yyyy-MM-dd"
        )}') WHERE id=${todoId}`;
        await database.run(updateQuery);
        response.send("Due Date Updated");
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
    }
  }
});

// API-6 Delete TODO
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteQuery = `DELETE FROM todo WHERE id=${todoId};`;
  await database.run(deleteQuery);
  response.send("Todo Deleted");
});

module.exports = app;
