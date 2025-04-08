export const dice = (io, socket, rooms) => {
    socket.on("player-choice", ({ room, choice }) => {
        if (!rooms[room]) return;

    })
  };
  