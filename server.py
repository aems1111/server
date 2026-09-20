import asyncio
import json
import uuid
import time
import os
from datetime import datetime

import websockets


# ============================================================
# SERVER CONFIG
# ============================================================

HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", 8765))

# هر Room دقیقاً برای 1v1 است
MAX_PLAYERS_PER_ROOM = 2

COUNTDOWN_SECONDS = 3


# ============================================================
# RECONNECT SETTINGS
# ============================================================

# مدت زمانی که بازیکن بعد از قطع شدن فرصت برگشت دارد
RECONNECT_GRACE_SECONDS = 10


# ============================================================
# DATA
# ============================================================

# player_id -> player object
players = {}

# لیست player_id هایی که منتظر Match هستند
waiting_players = []

# room_id -> room object
rooms = {}


# ============================================================
# LOCKS
# ============================================================

# ------------------------------------------------------------
# جلوگیری از Matchmaking همزمان
#
# مهم برای زمانی که چندین بازیکن تقریباً همزمان روی
# CREATE RACE / FIND MATCH کلیک می‌کنند.
# ------------------------------------------------------------

matchmaking_lock = asyncio.Lock()


# ============================================================
# UTILS
# ============================================================

def create_player_id():

    return uuid.uuid4().hex[:8].upper()


def create_room_id():

    return uuid.uuid4().hex[:6].upper()


def create_reconnect_token():

    return uuid.uuid4().hex + uuid.uuid4().hex


def now():

    return datetime.now().strftime("%H:%M:%S")


# ============================================================
# SEND JSON
# ============================================================

async def send_json(websocket, data):

    # --------------------------------------------------------
    # اگر WebSocket وجود نداشته باشد، کاری نمی‌کنیم.
    # این حالت برای بازیکنی که در حال reconnect است طبیعی است.
    # --------------------------------------------------------

    if websocket is None:

        return

    try:

        await websocket.send(
            json.dumps(
                data,
                separators=(",", ":")
            )
        )

    except Exception:

        pass


# ============================================================
# BROADCAST ROOM
# ============================================================

async def broadcast_room(room, data):

    """
    پیام را فقط به بازیکنان همان Room ارسال می‌کند.

    Roomهای دیگر هیچ پیامی از این broadcast دریافت نمی‌کنند.
    """

    if room is None:

        return

    tasks = []

    for player in list(
        room["players"].values()
    ):

        # ----------------------------------------------------
        # بازیکن باید متصل باشد
        # ----------------------------------------------------

        if not player.get(
            "connected",
            True
        ):

            continue

        websocket = player.get(
            "websocket"
        )

        if websocket is None:

            continue

        tasks.append(
            send_json(
                websocket,
                data
            )
        )

    if tasks:

        await asyncio.gather(
            *tasks,
            return_exceptions=True
        )


# ============================================================
# ROOM HELPERS
# ============================================================

def get_room(player):

    room_id = player.get(
        "room_id"
    )

    if room_id is None:

        return None

    return rooms.get(
        room_id
    )


def get_opponent(room, player_id):

    if room is None:

        return None

    for other_id, other_player in room["players"].items():

        if other_id != player_id:

            return other_player

    return None


def room_player_count(room):

    if room is None:

        return 0

    return len(
        room.get(
            "players",
            {}
        )
    )


def remove_player_from_waiting(player_id):

    """
    تمام occurrence های یک player_id را از Queue حذف می‌کند.
    """

    while player_id in waiting_players:

        waiting_players.remove(
            player_id
        )


# ============================================================
# MATCHMAKING
# ============================================================

async def find_match(player):

    global waiting_players

    player_id = player["id"]

    # --------------------------------------------------------
    # Lock
    #
    # فقط یک Matchmaking در هر لحظه Queue را تغییر می‌دهد.
    # --------------------------------------------------------

    async with matchmaking_lock:

        # ----------------------------------------------------
        # اگر قبلاً Room دارد
        # ----------------------------------------------------

        if player.get(
            "room_id"
        ) is not None:

            await send_json(
                player["websocket"],
                {
                    "type":
                        "error",

                    "message":
                        "You are already inside a room."
                }
            )

            return

        # ----------------------------------------------------
        # اگر قبلاً در Queue است
        # ----------------------------------------------------

        if player_id in waiting_players:

            await send_json(
                player["websocket"],
                {
                    "type":
                        "waiting_for_match",

                    "player_id":
                        player_id,

                    "status":
                        "WAITING"
                }
            )

            return

        # ----------------------------------------------------
        # Find opponent
        # ----------------------------------------------------

        opponent = None

        while waiting_players:

            opponent_id = waiting_players.pop(0)

            # -----------------------------------------------
            # جلوگیری از match با خودش
            # -----------------------------------------------

            if opponent_id == player_id:

                continue

            possible_opponent = players.get(
                opponent_id
            )

            # -----------------------------------------------
            # Player دیگر وجود ندارد
            # -----------------------------------------------

            if possible_opponent is None:

                continue

            # -----------------------------------------------
            # Player disconnected
            # -----------------------------------------------

            if not possible_opponent.get(
                "connected",
                True
            ):

                continue

            # -----------------------------------------------
            # Player قبلاً وارد Room شده
            # -----------------------------------------------

            if possible_opponent.get(
                "room_id"
            ) is not None:

                continue

            opponent = possible_opponent

            break

        # ----------------------------------------------------
        # هیچ حریفی پیدا نشد
        # ----------------------------------------------------

        if opponent is None:

            waiting_players.append(
                player_id
            )

            print(
                f"[{now()}] Player {player_id} "
                f"is waiting for opponent."
            )

            print(
                f"[{now()}] Waiting players: "
                f"{len(waiting_players)}"
            )

            await send_json(
                player["websocket"],
                {
                    "type":
                        "waiting_for_match",

                    "player_id":
                        player_id,

                    "status":
                        "WAITING"
                }
            )

            return

        # ----------------------------------------------------
        # ساخت Room جدید
        # ----------------------------------------------------

        room_id = create_room_id()

        # ----------------------------------------------------
        # اطمینان از یکتا بودن Room ID
        # ----------------------------------------------------

        while room_id in rooms:

            room_id = create_room_id()

        # ----------------------------------------------------
        # هر Room فقط MAX_PLAYERS_PER_ROOM بازیکن دارد.
        # برای 1v1 باید دقیقاً 2 نفر باشند.
        # ----------------------------------------------------

        room = {

            "id":
                room_id,

            "players": {
                opponent["id"]: opponent,
                player["id"]: player
            },

            "status":
                "READY",

            "countdown_running":
                False,

            "race_start_time":
                None,

            "winner_id":
                None,

            "winner_time":
                None,

            "created_at":
                now(),

            # ------------------------------------------------
            # Reconnect task
            # ------------------------------------------------

            "reconnect_task":
                None,

            "disconnected_player_id":
                None
        }

        # ----------------------------------------------------
        # Room را ثبت کن
        # ----------------------------------------------------

        rooms[room_id] = room

        # ----------------------------------------------------
        # Assign room
        # ----------------------------------------------------

        opponent["room_id"] = room_id
        player["room_id"] = room_id

        opponent["ready"] = False
        player["ready"] = False

        opponent["finished"] = False
        player["finished"] = False

        opponent["finish_time"] = None
        player["finish_time"] = None

        opponent["reconnecting"] = False
        player["reconnecting"] = False

        opponent["disconnected_at"] = None
        player["disconnected_at"] = None

        # ----------------------------------------------------
        # اطلاعات Room
        # ----------------------------------------------------

        print()
        print("=" * 70)
        print(
            f"[{now()}] MATCH FOUND"
        )
        print(
            f"Room: {room_id}"
        )
        print(
            f"Player 1: {opponent['id']}"
        )
        print(
            f"Player 2: {player['id']}"
        )
        print(
            f"Players in room: "
            f"{room_player_count(room)}/"
            f"{MAX_PLAYERS_PER_ROOM}"
        )
        print(
            f"Total active rooms: "
            f"{len(rooms)}"
        )
        print("=" * 70)

        # ----------------------------------------------------
        # Player 1
        # ----------------------------------------------------

        await send_json(
            opponent["websocket"],
            {
                "type":
                    "match_found",

                "room_id":
                    room_id,

                "player_id":
                    opponent["id"],

                "opponent_id":
                    player["id"],

                "players":
                    room_player_count(room),

                "status":
                    "READY"
            }
        )

        # ----------------------------------------------------
        # Player 2
        # ----------------------------------------------------

        await send_json(
            player["websocket"],
            {
                "type":
                    "match_found",

                "room_id":
                    room_id,

                "player_id":
                    player["id"],

                "opponent_id":
                    opponent["id"],

                "players":
                    room_player_count(room),

                "status":
                    "READY"
            }
        )


# ============================================================
# READY
# ============================================================

async def player_ready(player):

    room_id = player.get(
        "room_id"
    )

    if room_id is None:

        await send_json(
            player["websocket"],
            {
                "type":
                    "error",

                "message":
                    "You are not inside a room."
            }
        )

        return

    room = rooms.get(
        room_id
    )

    if room is None:

        player["room_id"] = None

        await send_json(
            player["websocket"],
            {
                "type":
                    "error",

                "message":
                    "Room no longer exists."
            }
        )

        return

    # --------------------------------------------------------
    # مطمئن شو Player واقعاً داخل همین Room است
    # --------------------------------------------------------

    if player["id"] not in room["players"]:

        player["room_id"] = None

        await send_json(
            player["websocket"],
            {
                "type":
                    "error",

                "message":
                    "Player is not registered in this room."
            }
        )

        return

    if room["status"] == "RUNNING":

        await send_json(
            player["websocket"],
            {
                "type":
                    "error",

                "message":
                    "Race has already started."
            }
        )

        return

    if room["status"] == "FINISHED":

        await send_json(
            player["websocket"],
            {
                "type":
                    "error",

                "message":
                    "Race is finished. Return to lobby."
            }
        )

        return

    if room["countdown_running"]:

        return

    player["ready"] = True

    print(
        f"[{now()}] Player {player['id']} "
        f"is READY in room {room_id}"
    )

    await broadcast_room(
        room,
        {
            "type":
                "player_ready",

            "player_id":
                player["id"]
        }
    )

    # --------------------------------------------------------
    # فقط بازیکنان همین Room بررسی می‌شوند.
    # --------------------------------------------------------

    if room_player_count(room) != MAX_PLAYERS_PER_ROOM:

        return

    all_ready = all(
        p.get(
            "ready",
            False
        )
        for p in room["players"].values()
    )

    if not all_ready:

        return

    # --------------------------------------------------------
    # شروع Countdown
    # --------------------------------------------------------

    room["countdown_running"] = True

    asyncio.create_task(
        start_countdown(room)
    )


# ============================================================
# COUNTDOWN
# ============================================================

async def start_countdown(room):

    room_id = room["id"]

    print()
    print(
        f"[{now()}] COUNTDOWN STARTED "
        f"Room: {room_id}"
    )

    for number in range(
        COUNTDOWN_SECONDS,
        0,
        -1
    ):

        # ----------------------------------------------------
        # Room ممکن است حذف شده باشد
        # ----------------------------------------------------

        if room_id not in rooms:

            return

        # ----------------------------------------------------
        # اگر Room دیگری وجود دارد، به آن دست نزن.
        # این تابع فقط Room خودش را کنترل می‌کند.
        # ----------------------------------------------------

        current_room = rooms.get(
            room_id
        )

        if current_room is not room:

            return

        # ----------------------------------------------------
        # اگر بازیکن قطع شده باشد
        # ----------------------------------------------------

        disconnected_exists = any(
            not p.get(
                "connected",
                True
            )
            for p in room["players"].values()
        )

        if disconnected_exists:

            room["countdown_running"] = False

            room["status"] = "READY"

            return

        # ----------------------------------------------------
        # Room باید هنوز 2 بازیکن داشته باشد
        # ----------------------------------------------------

        if room_player_count(room) != MAX_PLAYERS_PER_ROOM:

            room["countdown_running"] = False

            room["status"] = "READY"

            return

        room["status"] = "COUNTDOWN"

        await broadcast_room(
            room,
            {
                "type":
                    "countdown",

                "room_id":
                    room_id,

                "number":
                    number
            }
        )

        print(
            f"[{now()}] Room {room_id} "
            f"COUNTDOWN: {number}"
        )

        await asyncio.sleep(
            1
        )

    # --------------------------------------------------------
    # Check room again
    # --------------------------------------------------------

    if room_id not in rooms:

        return

    current_room = rooms.get(
        room_id
    )

    if current_room is not room:

        return

    # --------------------------------------------------------
    # Make sure room still has exactly 2 players
    # --------------------------------------------------------

    if room_player_count(room) != MAX_PLAYERS_PER_ROOM:

        room["countdown_running"] = False

        room["status"] = "READY"

        return

    # --------------------------------------------------------
    # Make sure both players are connected
    # --------------------------------------------------------

    all_connected = all(
        p.get(
            "connected",
            True
        )
        for p in room["players"].values()
    )

    if not all_connected:

        room["countdown_running"] = False

        room["status"] = "READY"

        return

    # --------------------------------------------------------
    # Race starts
    # --------------------------------------------------------

    room["status"] = "RUNNING"

    room["countdown_running"] = False

    room["race_start_time"] = (
        time.monotonic()
    )

    print()
    print(
        f"[{now()}] RACE STARTED "
        f"Room: {room_id}"
    )

    await broadcast_room(
        room,
        {
            "type":
                "race_start",

            "room_id":
                room_id,

            "status":
                "RUNNING"
        }
    )


# ============================================================
# PLAYER STATE
# ============================================================

async def player_state(
    player,
    data
):

    room_id = player.get(
        "room_id"
    )

    if room_id is None:

        return

    room = rooms.get(
        room_id
    )

    if room is None:

        return

    if room["status"] != "RUNNING":

        return

    # --------------------------------------------------------
    # بازیکن باید واقعاً داخل Room باشد.
    # --------------------------------------------------------

    if player["id"] not in room["players"]:

        return

    # --------------------------------------------------------
    # بازیکن قطع شده نباید State بفرستد.
    # --------------------------------------------------------

    if not player.get(
        "connected",
        True
    ):

        return

    # --------------------------------------------------------
    # State باید داخل state باشد.
    #
    # {
    #     "type": "player_state",
    #     "state": {
    #         "position": ...,
    #         "rotation": ...,
    #         "velocity": ...
    #     }
    # }
    # --------------------------------------------------------

    state = {

        "type":
            "opponent_state",

        "player_id":
            player["id"],

        "state":
            data.get(
                "state",
                {}
            )
    }

    # --------------------------------------------------------
    # فقط به حریف همین Room ارسال کن.
    #
    # هر Room کاملاً از Roomهای دیگر جدا است.
    # --------------------------------------------------------

    opponent = get_opponent(
        room,
        player["id"]
    )

    if opponent is None:

        return

    if not opponent.get(
        "connected",
        True
    ):

        return

    websocket = opponent.get(
        "websocket"
    )

    if websocket is None:

        return

    await send_json(
        websocket,
        state
    )


# ============================================================
# FINISH
# ============================================================

async def player_finish(player):

    room_id = player.get(
        "room_id"
    )

    if room_id is None:

        return

    room = rooms.get(
        room_id
    )

    if room is None:

        return

    # --------------------------------------------------------
    # Race already finished
    # --------------------------------------------------------

    if room["status"] == "FINISHED":

        return

    # --------------------------------------------------------
    # Race not started
    # --------------------------------------------------------

    if room["status"] != "RUNNING":

        await send_json(
            player["websocket"],
            {
                "type":
                    "error",

                "message":
                    "Race has not started."
            }
        )

        return

    # --------------------------------------------------------
    # Player باید داخل همین Room باشد.
    # --------------------------------------------------------

    if player["id"] not in room["players"]:

        return

    # --------------------------------------------------------
    # Duplicate finish
    # --------------------------------------------------------

    if player.get(
        "finished",
        False
    ):

        return

    race_start_time = room.get(
        "race_start_time"
    )

    if race_start_time is None:

        return

    current_time = time.monotonic()

    elapsed = (
        current_time -
        race_start_time
    )

    elapsed = round(
        elapsed,
        3
    )

    player["finished"] = True

    player["finish_time"] = elapsed

    # --------------------------------------------------------
    # FIRST PLAYER = WINNER
    # --------------------------------------------------------

    if room["winner_id"] is None:

        room["winner_id"] = (
            player["id"]
        )

        room["winner_time"] = (
            elapsed
        )

        print()
        print("=" * 60)
        print(
            f"[{now()}] WINNER FOUND"
        )
        print(
            f"Room: {room_id}"
        )
        print(
            f"Winner: {player['id']}"
        )
        print(
            f"Winning Time: {elapsed:.3f}s"
        )
        print(
            f"Active rooms: {len(rooms)}"
        )
        print("=" * 60)

        # ----------------------------------------------------
        # Player finished
        # ----------------------------------------------------

        await broadcast_room(
            room,
            {
                "type":
                    "player_finished",

                "player_id":
                    player["id"],

                "time":
                    elapsed,

                "position":
                    1,

                "result":
                    "WIN"
            }
        )

        # ----------------------------------------------------
        # Race finished
        # ----------------------------------------------------

        room["status"] = "FINISHED"

        await broadcast_room(
            room,
            {
                "type":
                    "race_finished",

                "room_id":
                    room_id,

                "status":
                    "FINISHED",

                "winner_id":
                    player["id"],

                "winner_time":
                    elapsed
            }
        )

        return


# ============================================================
# LEAVE ROOM / RETURN TO LOBBY
# ============================================================

async def leave_room(player):

    global waiting_players

    player_id = player["id"]

    # --------------------------------------------------------
    # Remove player from matchmaking queue
    # --------------------------------------------------------

    remove_player_from_waiting(
        player_id
    )

    room_id = player.get(
        "room_id"
    )

    # --------------------------------------------------------
    # Player already outside a room
    # --------------------------------------------------------

    if room_id is None:

        await send_json(
            player["websocket"],
            {
                "type":
                    "returned_to_lobby"
            }
        )

        return

    room = rooms.get(
        room_id
    )

    # --------------------------------------------------------
    # Room no longer exists
    # --------------------------------------------------------

    if room is None:

        player["room_id"] = None
        player["ready"] = False
        player["finished"] = False
        player["finish_time"] = None
        player["reconnecting"] = False
        player["disconnected_at"] = None

        await send_json(
            player["websocket"],
            {
                "type":
                    "returned_to_lobby"
            }
        )

        return

    # ========================================================
    # Cancel reconnect timer
    # ========================================================

    reconnect_task = room.get(
        "reconnect_task"
    )

    if reconnect_task is not None:

        reconnect_task.cancel()

        room["reconnect_task"] = None

    # ========================================================
    # Copy players BEFORE deleting room
    # ========================================================

    room_players = list(
        room["players"].values()
    )

    print()
    print("=" * 60)
    print(
        f"[{now()}] ROOM CLOSED"
    )
    print(
        f"Room: {room_id}"
    )
    print(
        f"Requested by: {player_id}"
    )
    print(
        "Reason: RETURN TO LOBBY"
    )
    print("=" * 60)

    # ========================================================
    # Remove room relationship from EVERY player
    # ========================================================

    for room_player in room_players:

        room_player["room_id"] = None

        room_player["ready"] = False

        room_player["finished"] = False

        room_player["finish_time"] = None

        room_player["reconnecting"] = False

        room_player["disconnected_at"] = None

    # ========================================================
    # Delete only THIS Room
    #
    # مهم:
    # Roomهای دیگر اصلاً تغییر نمی‌کنند.
    # ========================================================

    if room_id in rooms:

        del rooms[
            room_id
        ]

    # ========================================================
    # Tell clients in THIS Room
    # ========================================================

    for room_player in room_players:

        if room_player.get(
            "connected",
            True
        ):

            websocket = room_player.get(
                "websocket"
            )

            if websocket is None:

                continue

            await send_json(
                websocket,
                {
                    "type":
                        "room_closed",

                    "room_id":
                        room_id,

                    "reason":
                        "return_to_lobby",

                    "player_id":
                        player_id
                }
            )

    # ========================================================
    # Remove disconnected player if room was closed
    # ========================================================

    for room_player in room_players:

        if room_player["id"] == player_id:

            continue

        if not room_player.get(
            "connected",
            True
        ):

            old_id = room_player["id"]

            if old_id in players:

                del players[
                    old_id
                ]

            print(
                f"[{now()}] Disconnected player "
                f"{old_id} removed because room closed."
            )

    # ========================================================
    # Return to lobby
    # ========================================================

    await send_json(
        player["websocket"],
        {
            "type":
                "returned_to_lobby",

            "room_id":
                room_id
        }
    )

    print(
        f"[{now()}] Room {room_id} "
        f"is completely closed."
    )

    print(
        f"[{now()}] Active rooms remaining: "
        f"{len(rooms)}"
    )


# ============================================================
# CANCEL MATCHMAKING
# ============================================================

async def cancel_match(player):

    global waiting_players

    async with matchmaking_lock:

        if player["id"] in waiting_players:

            waiting_players.remove(
                player["id"]
            )

            await send_json(
                player["websocket"],
                {
                    "type":
                        "matchmaking_cancelled",

                    "player_id":
                        player["id"]
                }
            )

            print(
                f"[{now()}] Player "
                f"{player['id']} "
                f"cancelled matchmaking."
            )

            print(
                f"[{now()}] Waiting players: "
                f"{len(waiting_players)}"
            )


# ============================================================
# RECONNECT TIMEOUT
# ============================================================

async def reconnect_timeout(
    room_id,
    disconnected_player_id
):

    try:

        # ----------------------------------------------------
        # Wait for reconnect period
        # ----------------------------------------------------

        await asyncio.sleep(
            RECONNECT_GRACE_SECONDS
        )

    except asyncio.CancelledError:

        # ----------------------------------------------------
        # Player successfully reconnected.
        # ----------------------------------------------------

        return

    # --------------------------------------------------------
    # Get Room
    # --------------------------------------------------------

    room = rooms.get(
        room_id
    )

    if room is None:

        return

    # --------------------------------------------------------
    # Get disconnected player
    # --------------------------------------------------------

    disconnected_player = players.get(
        disconnected_player_id
    )

    # --------------------------------------------------------
    # Player reconnected
    # --------------------------------------------------------

    if (
        disconnected_player is not None
        and disconnected_player.get(
            "connected",
            False
        )
    ):

        return

    print()
    print("=" * 60)
    print(
        f"[{now()}] RECONNECT TIMEOUT"
    )
    print(
        f"Room: {room_id}"
    )
    print(
        f"Disconnected Player: "
        f"{disconnected_player_id}"
    )
    print(
        "Result: Remaining player wins"
    )
    print("=" * 60)

    # --------------------------------------------------------
    # Race finished
    # --------------------------------------------------------

    room["status"] = "FINISHED"

    room["countdown_running"] = False

    # --------------------------------------------------------
    # Find remaining connected player
    # --------------------------------------------------------

    remaining_player = None

    for player_id, room_player in room["players"].items():

        if player_id == disconnected_player_id:

            continue

        if room_player.get(
            "connected",
            True
        ):

            remaining_player = room_player

            break

    # --------------------------------------------------------
    # Remaining player wins
    # --------------------------------------------------------

    if remaining_player is not None:

        winner_time = 0.0

        race_start_time = room.get(
            "race_start_time"
        )

        if race_start_time is not None:

            winner_time = round(
                time.monotonic() -
                race_start_time,
                3
            )

        room["winner_id"] = (
            remaining_player["id"]
        )

        room["winner_time"] = (
            winner_time
        )

        await send_json(
            remaining_player["websocket"],
            {
                "type":
                    "race_finished",

                "room_id":
                    room_id,

                "status":
                    "FINISHED",

                "winner_id":
                    remaining_player["id"],

                "winner_time":
                    winner_time,

                "reason":
                    "opponent_disconnect_timeout"
            }
        )

    # --------------------------------------------------------
    # Remove disconnected player
    # --------------------------------------------------------

    if disconnected_player_id in players:

        del players[
            disconnected_player_id
        ]

    # --------------------------------------------------------
    # Keep room until remaining player returns to lobby.
    # --------------------------------------------------------

    room["disconnected_player_id"] = None

    room["reconnect_task"] = None

    print(
        f"[{now()}] Reconnect period expired."
    )

    print(
        f"[{now()}] Active rooms: "
        f"{len(rooms)}"
    )


# ============================================================
# HANDLE DISCONNECT
# ============================================================

async def handle_disconnect(player):

    global waiting_players

    player_id = player["id"]

    # --------------------------------------------------------
    # Remove from matchmaking
    # --------------------------------------------------------

    remove_player_from_waiting(
        player_id
    )

    room_id = player.get(
        "room_id"
    )

    # --------------------------------------------------------
    # Player is not inside a room
    # --------------------------------------------------------

    if room_id is None:

        if player_id in players:

            del players[
                player_id
            ]

        print(
            f"[{now()}] "
            f"Player disconnected: "
            f"{player_id}"
        )

        print(
            f"[{now()}] "
            f"Players online: "
            f"{len(players)}"
        )

        return

    room = rooms.get(
        room_id
    )

    # --------------------------------------------------------
    # Room no longer exists
    # --------------------------------------------------------

    if room is None:

        if player_id in players:

            del players[
                player_id
            ]

        print(
            f"[{now()}] "
            f"Player disconnected: "
            f"{player_id}"
        )

        return

    # ========================================================
    # RACE IS RUNNING
    #
    # اجازه reconnect
    # ========================================================

    if room["status"] == "RUNNING":

        player["connected"] = False

        player["websocket"] = None

        player["reconnecting"] = True

        player["disconnected_at"] = time.monotonic()

        room["disconnected_player_id"] = (
            player_id
        )

        print()
        print("=" * 60)
        print(
            f"[{now()}] PLAYER DISCONNECTED "
            f"DURING RACE"
        )
        print(
            f"Room: {room_id}"
        )
        print(
            f"Player: {player_id}"
        )
        print(
            f"Reconnect time: "
            f"{RECONNECT_GRACE_SECONDS} seconds"
        )
        print("=" * 60)

        # ----------------------------------------------------
        # Tell remaining player
        # ----------------------------------------------------

        for other_id, other_player in room["players"].items():

            if other_id == player_id:

                continue

            if other_player.get(
                "connected",
                True
            ):

                websocket = other_player.get(
                    "websocket"
                )

                if websocket is not None:

                    await send_json(
                        websocket,
                        {
                            "type":
                                "opponent_disconnected_waiting",

                            "room_id":
                                room_id,

                            "player_id":
                                player_id,

                            "seconds":
                                RECONNECT_GRACE_SECONDS
                        }
                    )

        # ----------------------------------------------------
        # Cancel old timer
        # ----------------------------------------------------

        old_task = room.get(
            "reconnect_task"
        )

        if old_task is not None:

            old_task.cancel()

        # ----------------------------------------------------
        # Start reconnect timer for THIS Room only
        # ----------------------------------------------------

        room["reconnect_task"] = asyncio.create_task(
            reconnect_timeout(
                room_id,
                player_id
            )
        )

        return

    # ========================================================
    # COUNTDOWN / READY
    #
    # No reconnect during countdown.
    # ========================================================

    if (
        room["status"] == "READY"
        or room["status"] == "COUNTDOWN"
    ):

        if room.get(
            "countdown_running",
            False
        ):

            print(
                f"[{now()}] Countdown stopped "
                f"because player {player_id} disconnected."
            )

        # ----------------------------------------------------
        # Remove player from THIS Room only
        # ----------------------------------------------------

        if player_id in room["players"]:

            del room["players"][
                player_id
            ]

        # ----------------------------------------------------
        # Remaining player becomes free
        # ----------------------------------------------------

        for remaining_player in room["players"].values():

            remaining_player["room_id"] = None

            remaining_player["ready"] = False

            remaining_player["finished"] = False

            remaining_player["finish_time"] = None

            websocket = remaining_player.get(
                "websocket"
            )

            if websocket is not None:

                await send_json(
                    websocket,
                    {
                        "type":
                            "opponent_disconnected",

                        "player_id":
                            player_id,

                        "room_id":
                            room_id,

                        "reason":
                            "before_race"
                    }
                )

        # ----------------------------------------------------
        # Delete ONLY this Room
        # ----------------------------------------------------

        if room_id in rooms:

            del rooms[
                room_id
            ]

        if player_id in players:

            del players[
                player_id
            ]

        print(
            f"[{now()}] Player "
            f"{player_id} left room "
            f"{room_id}"
        )

        print(
            f"[{now()}] "
            f"Room {room_id} closed before race."
        )

        print(
            f"[{now()}] Active rooms remaining: "
            f"{len(rooms)}"
        )

        return

    # ========================================================
    # RACE FINISHED
    # ========================================================

    if room["status"] == "FINISHED":

        # ----------------------------------------------------
        # No reconnect needed after race finished.
        # ----------------------------------------------------

        if player_id in room["players"]:

            del room["players"][
                player_id
            ]

        if len(
            room["players"]
        ) == 0:

            if room_id in rooms:

                del rooms[
                    room_id
                ]

        if player_id in players:

            del players[
                player_id
            ]

        print(
            f"[{now()}] "
            f"Finished-race player disconnected: "
            f"{player_id}"
        )

        print(
            f"[{now()}] Active rooms: "
            f"{len(rooms)}"
        )

        return


# ============================================================
# RECONNECT PLAYER
# ============================================================

async def reconnect_player(
    websocket,
    player_id,
    reconnect_token
):

    # --------------------------------------------------------
    # Find old player
    # --------------------------------------------------------

    player = players.get(
        player_id
    )

    if player is None:

        await send_json(
            websocket,
            {
                "type":
                    "reconnect_failed",

                "reason":
                    "player_not_found"
            }
        )

        print(
            f"[{now()}] Reconnect failed: "
            f"player not found: {player_id}"
        )

        return None

    # --------------------------------------------------------
    # Check token
    # --------------------------------------------------------

    if player.get(
        "reconnect_token"
    ) != reconnect_token:

        await send_json(
            websocket,
            {
                "type":
                    "reconnect_failed",

                "reason":
                    "invalid_token"
            }
        )

        print(
            f"[{now()}] Reconnect failed: "
            f"invalid token for {player_id}"
        )

        return None

    # --------------------------------------------------------
    # Player must actually be disconnected
    # --------------------------------------------------------

    if player.get(
        "connected",
        True
    ):

        await send_json(
            websocket,
            {
                "type":
                    "reconnect_failed",

                "reason":
                    "already_connected"
            }
        )

        return None

    # --------------------------------------------------------
    # Must be in reconnect mode
    # --------------------------------------------------------

    if not player.get(
        "reconnecting",
        False
    ):

        await send_json(
            websocket,
            {
                "type":
                    "reconnect_failed",

                "reason":
                    "reconnect_not_allowed"
            }
        )

        return None

    # --------------------------------------------------------
    # Check reconnect time
    # --------------------------------------------------------

    disconnected_at = player.get(
        "disconnected_at"
    )

    if disconnected_at is None:

        await send_json(
            websocket,
            {
                "type":
                    "reconnect_failed",

                "reason":
                    "disconnect_time_missing"
            }
        )

        return None

    elapsed = (
        time.monotonic() -
        disconnected_at
    )

    if elapsed > RECONNECT_GRACE_SECONDS:

        await send_json(
            websocket,
            {
                "type":
                    "reconnect_failed",

                "reason":
                    "reconnect_timeout"
            }
        )

        return None

    # --------------------------------------------------------
    # Find Room
    # --------------------------------------------------------

    room_id = player.get(
        "room_id"
    )

    if room_id is None:

        await send_json(
            websocket,
            {
                "type":
                    "reconnect_failed",

                "reason":
                    "room_not_found"
            }
        )

        return None

    room = rooms.get(
        room_id
    )

    if room is None:

        await send_json(
            websocket,
            {
                "type":
                    "reconnect_failed",

                "reason":
                    "room_not_found"
            }
        )

        return None

    # --------------------------------------------------------
    # Race must still be running
    # --------------------------------------------------------

    if room["status"] != "RUNNING":

        await send_json(
            websocket,
            {
                "type":
                    "reconnect_failed",

                "reason":
                    "race_not_running"
            }
        )

        return None

    # --------------------------------------------------------
    # Player must still belong to THIS Room
    # --------------------------------------------------------

    if player_id not in room["players"]:

        await send_json(
            websocket,
            {
                "type":
                    "reconnect_failed",

                "reason":
                    "player_not_in_room"
            }
        )

        return None

    # ========================================================
    # SUCCESS
    # ========================================================

    player["websocket"] = websocket

    player["connected"] = True

    player["reconnecting"] = False

    player["disconnected_at"] = None

    room["disconnected_player_id"] = None

    # --------------------------------------------------------
    # Cancel timeout task
    # --------------------------------------------------------

    reconnect_task = room.get(
        "reconnect_task"
    )

    if reconnect_task is not None:

        reconnect_task.cancel()

        room["reconnect_task"] = None

    # --------------------------------------------------------
    # Find opponent
    # --------------------------------------------------------

    opponent_id = None

    for other_id in room["players"].keys():

        if other_id != player_id:

            opponent_id = other_id

            break

    print()
    print("=" * 60)
    print(
        f"[{now()}] PLAYER RECONNECTED"
    )
    print(
        f"Player: {player_id}"
    )
    print(
        f"Room: {room_id}"
    )
    print(
        f"Opponent: {opponent_id}"
    )
    print("=" * 60)

    # --------------------------------------------------------
    # Tell reconnected player
    # --------------------------------------------------------

    await send_json(
        websocket,
        {
            "type":
                "reconnected",

            "player_id":
                player_id,

            "room_id":
                room_id,

            "opponent_id":
                opponent_id,

            "race_start_time":
                room.get(
                    "race_start_time"
                ),

            "status":
                "RUNNING"
        }
    )

    # --------------------------------------------------------
    # Tell opponent
    # --------------------------------------------------------

    if opponent_id is not None:

        opponent = room["players"].get(
            opponent_id
        )

        if opponent is not None:

            if opponent.get(
                "connected",
                True
            ):

                opponent_websocket = opponent.get(
                    "websocket"
                )

                if opponent_websocket is not None:

                    await send_json(
                        opponent_websocket,
                        {
                            "type":
                                "opponent_reconnected",

                            "room_id":
                                room_id,

                            "player_id":
                                player_id
                        }
                    )

    return player


# ============================================================
# MESSAGE HANDLER
# ============================================================

async def handle_message(
    player,
    message
):

    try:

        data = json.loads(
            message
        )

    except json.JSONDecodeError:

        await send_json(
            player["websocket"],
            {
                "type":
                    "error",

                "message":
                    "Invalid JSON."
            }
        )

        return

    message_type = data.get(
        "type"
    )

    # --------------------------------------------------------
    # PING
    # --------------------------------------------------------

    if message_type == "ping":

        await send_json(
            player["websocket"],
            {
                "type":
                    "pong",

                "server_time":
                    now()
            }
        )

        return

    # --------------------------------------------------------
    # FIND MATCH
    # --------------------------------------------------------

    if message_type == "find_match":

        await find_match(
            player
        )

        return

    # --------------------------------------------------------
    # CANCEL
    # --------------------------------------------------------

    if message_type == "cancel_match":

        await cancel_match(
            player
        )

        return

    # --------------------------------------------------------
    # READY
    # --------------------------------------------------------

    if message_type == "ready":

        await player_ready(
            player
        )

        return

    # --------------------------------------------------------
    # PLAYER STATE
    # --------------------------------------------------------

    if message_type == "player_state":

        await player_state(
            player,
            data
        )

        return

    # --------------------------------------------------------
    # FINISH
    # --------------------------------------------------------

    if message_type == "finish":

        await player_finish(
            player
        )

        return

    # --------------------------------------------------------
    # LEAVE ROOM
    # --------------------------------------------------------

    if message_type == "leave_room":

        await leave_room(
            player
        )

        return

    # --------------------------------------------------------
    # UNKNOWN
    # --------------------------------------------------------

    await send_json(
        player["websocket"],
        {
            "type":
                "error",

            "message":
                f"Unknown message type: "
                f"{message_type}"
        }
    )


# ============================================================
# CLIENT CONNECTION
# ============================================================

async def client_connected(
    websocket
):

    # ========================================================
    # TEMPORARY PLAYER
    #
    # ابتدا یک Player موقت می‌سازیم.
    # اگر اولین پیام reconnect باشد، Player قدیمی را پیدا
    # می‌کنیم.
    # ========================================================

    temporary_player_id = create_player_id()

    player = {

        "id":
            temporary_player_id,

        "websocket":
            websocket,

        "room_id":
            None,

        "ready":
            False,

        "finished":
            False,

        "finish_time":
            None,

        "connected_at":
            now(),

        # ----------------------------------------------------
        # Connection state
        # ----------------------------------------------------

        "connected":
            True,

        "reconnecting":
            False,

        "disconnected_at":
            None,

        # ----------------------------------------------------
        # Reconnect token
        # ----------------------------------------------------

        "reconnect_token":
            create_reconnect_token()
    }

    registered_player = False

    try:

        # ====================================================
        # Receive messages
        # ====================================================

        async for message in websocket:

            # =================================================
            # FIRST MESSAGE
            # =================================================

            if not registered_player:

                try:

                    first_data = json.loads(
                        message
                    )

                except json.JSONDecodeError:

                    await send_json(
                        websocket,
                        {
                            "type":
                                "error",

                            "message":
                                "Invalid JSON."
                        }
                    )

                    continue

                # =============================================
                # RECONNECT
                # =============================================

                if first_data.get(
                    "type"
                ) == "reconnect":

                    reconnect_player_id = str(
                        first_data.get(
                            "player_id",
                            ""
                        )
                    )

                    reconnect_token = str(
                        first_data.get(
                            "reconnect_token",
                            ""
                        )
                    )

                    reconnected_player = await reconnect_player(
                        websocket,
                        reconnect_player_id,
                        reconnect_token
                    )

                    if reconnected_player is None:

                        # -------------------------------------
                        # Reconnect failed.
                        # -------------------------------------

                        registered_player = False

                        continue

                    # =========================================
                    # Replace temporary player
                    # =========================================

                    player = reconnected_player

                    registered_player = True

                    continue

                # =============================================
                # NORMAL NEW CONNECTION
                # =============================================

                players[
                    player["id"]
                ] = player

                registered_player = True

                print()
                print(
                    f"[{now()}] "
                    f"Player connected: "
                    f"{player['id']}"
                )

                print(
                    f"Players online: "
                    f"{len(players)}"
                )

                # ---------------------------------------------
                # Send player ID + reconnect token
                # ---------------------------------------------

                await send_json(
                    websocket,
                    {
                        "type":
                            "connected",

                        "player_id":
                            player["id"],

                        "reconnect_token":
                            player[
                                "reconnect_token"
                            ],

                        "server":
                            "Python Game Server",

                        "version":
                            "2.0"
                    }
                )

                # ---------------------------------------------
                # Process first normal message
                # ---------------------------------------------

                await handle_message(
                    player,
                    message
                )

                continue

            # =================================================
            # NORMAL MESSAGE
            # =================================================

            await handle_message(
                player,
                message
            )

    except websockets.exceptions.ConnectionClosed:

        pass

    except Exception as error:

        print(
            f"[{now()}] "
            f"Player error "
            f"{player['id']}: "
            f"{error}"
        )

    finally:

        # ====================================================
        # Temporary connection that never registered
        # ====================================================

        if not registered_player:

            return

        # ====================================================
        # Find current player
        # ====================================================

        current_player = players.get(
            player["id"]
        )

        if current_player is None:

            return

        # ====================================================
        # IMPORTANT:
        #
        # اگر Player با Socket جدید reconnect کرده باشد،
        # Socket قدیمی نباید Player را حذف کند.
        # ====================================================

        if current_player.get(
            "websocket"
        ) is not websocket:

            return

        # ====================================================
        # Handle real disconnect
        # ====================================================

        await handle_disconnect(
            player
        )


# ============================================================
# SERVER STATUS
# ============================================================

async def status_loop():

    """
    هر 10 ثانیه وضعیت کلی سرور را چاپ می‌کند.
    """

    while True:

        try:

            await asyncio.sleep(
                10
            )

        except asyncio.CancelledError:

            return

        print()
        print(
            f"[{now()}] SERVER STATUS | "
            f"PLAYERS={len(players)} | "
            f"WAITING={len(waiting_players)} | "
            f"ROOMS={len(rooms)}"
        )

        # ----------------------------------------------------
        # نمایش Roomهای فعال
        # ----------------------------------------------------

        for room_id, room in list(
            rooms.items()
        ):

            room_player_ids = list(
                room["players"].keys()
            )

            print(
                f"    ROOM {room_id} | "
                f"STATUS={room['status']} | "
                f"PLAYERS={room_player_ids}"
            )

        print()


# ============================================================
# SERVER
# ============================================================

async def main():

    print()
    print("=" * 70)
    print("PYTHON GAME SERVER v2.0")
    print("=" * 70)

    print(
        f"Host: {HOST}"
    )

    print(
        f"Port: {PORT}"
    )

    print(
        f"WebSocket: "
        f"ws://localhost:{PORT}"
    )

    print(
        f"Max players per room: "
        f"{MAX_PLAYERS_PER_ROOM}"
    )

    print(
        f"Room type: "
        f"1v1"
    )

    print(
        f"Reconnect grace: "
        f"{RECONNECT_GRACE_SECONDS} seconds"
    )

    print(
        "Multi-room matchmaking: ENABLED"
    )

    print("=" * 70)
    print()

    async with websockets.serve(
        client_connected,
        HOST,
        PORT
    ):

        print(
            f"[{now()}] SERVER ONLINE"
        )

        print(
            "Waiting for players..."
        )

        print()

        # ----------------------------------------------------
        # Status monitor
        # ----------------------------------------------------

        asyncio.create_task(
            status_loop()
        )

        # ----------------------------------------------------
        # Keep server alive forever
        # ----------------------------------------------------

        await asyncio.Future()


# ============================================================
# START
# ============================================================

if __name__ == "__main__":

    try:

        asyncio.run(
            main()
        )

    except KeyboardInterrupt:

        print()
        print(
            "Server stopped."
        )

