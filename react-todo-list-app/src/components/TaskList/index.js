import List from "./List";
import "./style.css";
const TaskList = ({ tasks,onRemoveHandler }) => {
  return (
    <div className="tasklist-wrapper">
      <List tasks={tasks} onRemoveHandler={onRemoveHandler} />
    </div>
  );
};
export default TaskList;
