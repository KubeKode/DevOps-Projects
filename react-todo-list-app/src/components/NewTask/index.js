import NewTaskForm from "./Form";
import "./style.css";
const NewTask = ({ onAddTask }) => {
  const addTaskHandler = (taskName, taskDate) => {
    const newTask = {
      name: taskName,
      date: new Date(taskDate),
      id: Math.random(),
    };
    onAddTask(newTask)
  };
  return (
    <div className="new-task-wrapper">
      <NewTaskForm onAddTask={addTaskHandler} />
    </div>
  );
};
export default NewTask;
