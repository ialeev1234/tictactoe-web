# Python3.6 (Flask, SocketIO, SQLAlchemy), ReactJS, Docker, sqlite



Implement a multiplayer tic-tac-toe game (on a field 3х3).

The only thing a player can do when entering the server is to queue up for the game.
The game begins when one of the following occurs:
- The single player in the queue waits more than the specified time (defined in the configuration). In this case, the game starts with AI.
- The queue contains at least two players. In this case, the game starts for each two very first players in the queue.

Client requirements
- Text interface (user-friendliness of the interface will not be evaluated).
- For players it is required to show their percentage of wins/losses/draws.
- It should be clear where AI is, and where the player is in the game interface.

Server requirements
- Written in Python.
- Multiple games (arenas) support - more than two players can play game at the same time.
- Remembers players (auto registration at the first login, a separate registration procedure is not required).
- Counts the percentage of wins/losses for each player.
- Works on the only machine.

Comments
- You can use any framework.
- You can use any data storage system.
- The optimality of the AI algorithm is not mandatory.
- Provide deployment manual for the server.

To start app use:
- docker build .
- docker run --net=host [built image hash]