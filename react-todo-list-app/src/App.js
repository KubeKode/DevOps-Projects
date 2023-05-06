import { useState } from "react";
import "./App.css";
import Header from "./components/Header";
import TaskList from "./components/TaskList";
import NewTask from "./components/NewTask";
function App() {
  const tasks = [
    { name: "Road Trip", date: new Date(12, 2, 2020), id: "192022" },
    { name: "Write Book", date: new Date(12, 2, 2020), id: "2930223" },
    { name: "School Work", date: new Date(12, 2, 2020), id: "238283" },
    { name: "Home Work", date: new Date(12, 2, 2020), id: "2803283" },
  ];
  
  const [allTasks, setAllTasks] = useState(tasks);
  const removeId = (id) => {
    const newList = allTasks.filter((item) => item.id !== id);
    setAllTasks(newList);
  };
  const addTaskHandler=(newTaskData)=>{
    setAllTasks([newTaskData,...allTasks])

  }

  return (
    <div className="App">
      <Header />
      <NewTask onAddTask={addTaskHandler}/>
      <TaskList tasks={allTasks} onRemoveHandler={removeId} />
    </div>
  );
}

export default App;
