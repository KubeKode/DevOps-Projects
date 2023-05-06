const Form = ({ onAddTask }) => {
  const addTaskHandler = (event) => {
    event.preventDefault();
    const taskName = event.target[0].value;
    const taskDate = event.target[1].value;
    onAddTask(taskName,taskDate)
    event.target[1].value = "";
    event.target[0].value = "";
  };
  return (
    <form action="" className="form-wrapper" onSubmit={addTaskHandler}>
      <input
        type="text"
        name=""
        id=""
        className="task-name"
        placeholder="Enter task name"
      />
      <input
        type="date"
        name=""
        id=""
        className="task-date"
        placeholder="YYYY-MM-DD"
      />
      <button
        type="submit"
        className="w3-button w3-blue w3-border w3-border-white w3-round-large"
      >
        Add Task
      </button>
    </form>
  );
};
export default Form;
