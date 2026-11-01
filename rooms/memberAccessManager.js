const MAX_DISPLAY_NAME_LENGTH = 120;

function cleanText(value, maximumLength = MAX_DISPLAY_NAME_LENGTH) {
  return String(value ?? "").trim().slice(0, maximumLength);
}

export function normalizeRoomMember(record = {}, fallbackUid = "") {
  const uid = cleanText(record.uid || fallbackUid, 128);
  return {
    uid,
    displayName: cleanText(record.displayName, MAX_DISPLAY_NAME_LENGTH) || "Unnamed player",
    role: record.role === "dm" ? "dm" : "player"
  };
}

export function buildRoomMembershipBan({
  roomCode,
  member,
  bannedByUid,
  bannedByName,
  createdAtMillis = Date.now(),
  createdAt = null
} = {}) {
  const normalizedMember = normalizeRoomMember(member);
  const uid = normalizedMember.uid;

  if (!cleanText(roomCode, 32) || !uid || !cleanText(bannedByUid, 128)) {
    throw new Error("The room, member, and DM identity are required.");
  }

  if (normalizedMember.role === "dm" || uid === cleanText(bannedByUid, 128)) {
    throw new Error("The room DM cannot be blocked from their own campaign.");
  }

  return {
    uid,
    displayName: normalizedMember.displayName,
    bannedByUid: cleanText(bannedByUid, 128),
    bannedByName: cleanText(bannedByName, MAX_DISPLAY_NAME_LENGTH) || "Room DM",
    reason: "Removed by the room DM",
    createdAtMillis: Math.max(1, Math.round(Number(createdAtMillis) || Date.now())),
    ...(createdAt ? { createdAt } : {})
  };
}

export function createRoomMemberAccessManager(options = {}) {
  const {
    root,
    document: documentRef = globalThis.document,
    db,
    collection,
    doc,
    getDocs,
    query,
    where,
    writeBatch,
    serverTimestamp,
    requestConfirmation = async () => false,
    notify = () => {}
  } = options;

  let context = {
    roomCode: "",
    roomName: "",
    isDm: false,
    userId: "",
    userName: ""
  };
  let loadRevision = 0;
  let loading = false;
  let members = [];
  let bans = [];

  function setStatus(message, isError = false) {
    const element = root?.querySelector?.("[data-room-access-status]");
    if (!element) return;
    element.textContent = cleanText(message, 500);
    element.classList.toggle("error", isError);
  }

  function renderList(target, records, emptyMessage, renderRecord) {
    if (!target) return;
    target.replaceChildren();

    if (!records.length) {
      const empty = documentRef.createElement("p");
      empty.className = "small";
      empty.textContent = emptyMessage;
      target.append(empty);
      return;
    }

    records.forEach((record) => target.append(renderRecord(record)));
  }

  function createRow(record, actionLabel, action) {
    const row = documentRef.createElement("div");
    row.className = "row hg-room-access-row";

    const title = documentRef.createElement("div");
    title.className = "row-title";
    title.textContent = `${record.displayName || "Unnamed player"} — ${record.uid}`;
    row.append(title);

    const button = documentRef.createElement("button");
    button.type = "button";
    button.textContent = actionLabel;
    button.addEventListener("click", () => action(record));
    row.append(button);
    return row;
  }

  function render() {
    if (!root) return;

    root.classList.toggle("hidden", !context.isDm || !context.roomCode);
    if (!context.isDm || !context.roomCode) return;

    renderList(
      root.querySelector("[data-room-members-list]"),
      members.filter((member) => member.role !== "dm" && member.uid !== context.userId),
      "No player memberships are currently saved.",
      (member) => createRow(member, "Remove & Block Rejoin", banMember)
    );

    renderList(
      root.querySelector("[data-room-bans-list]"),
      bans,
      "No players are blocked from this room.",
      (ban) => createRow(ban, "Allow Rejoin", unbanMember)
    );
  }

  async function refresh() {
    if (!context.isDm || !context.roomCode || loading) return false;

    const revision = ++loadRevision;
    const roomCode = context.roomCode;
    loading = true;
    setStatus("Loading room access…");

    try {
      const [memberSnapshot, banSnapshot] = await Promise.all([
        getDocs(collection(db, "rooms", roomCode, "players")),
        getDocs(collection(db, "rooms", roomCode, "bannedUsers"))
      ]);

      if (revision !== loadRevision || roomCode !== context.roomCode) {
        return false;
      }

      members = memberSnapshot.docs
        .map((entry) => normalizeRoomMember(entry.data(), entry.id))
        .filter((entry) => entry.uid)
        .sort((left, right) => left.displayName.localeCompare(right.displayName));
      bans = banSnapshot.docs
        .map((entry) => ({
          uid: cleanText(entry.data()?.uid || entry.id, 128),
          displayName: cleanText(entry.data()?.displayName, MAX_DISPLAY_NAME_LENGTH) || "Unnamed player"
        }))
        .filter((entry) => entry.uid)
        .sort((left, right) => left.displayName.localeCompare(right.displayName));
      render();
      setStatus("Room access is up to date.");
      return true;
    } catch (error) {
      if (revision === loadRevision) {
        setStatus(`Could not load room access: ${error?.message || "Unknown error"}`, true);
      }
      return false;
    } finally {
      if (revision === loadRevision) loading = false;
    }
  }

  async function banMember(member) {
    if (!context.isDm || !context.roomCode) return false;
    const normalized = normalizeRoomMember(member);
    if (!normalized.uid || normalized.uid === context.userId || normalized.role === "dm") {
      return false;
    }

    const confirmed = await requestConfirmation(
      `${normalized.displayName} will lose room access and cannot rejoin with the room code until you allow them again.`,
      {
        title: "Remove and block player?",
        confirmLabel: "Remove & Block",
        tone: "danger"
      }
    );
    if (!confirmed) return false;

    const operationRoomCode = context.roomCode;
    const operationUserId = context.userId;
    setStatus(`Removing ${normalized.displayName}…`);

    try {
      const activeSnapshot = await getDocs(query(
        collection(db, "rooms", operationRoomCode, "activePlayers"),
        where("uid", "==", normalized.uid)
      ));
      if (operationRoomCode !== context.roomCode || operationUserId !== context.userId) {
        throw new Error("The active room or account changed.");
      }

      const batch = writeBatch(db);
      batch.set(
        doc(db, "rooms", operationRoomCode, "bannedUsers", normalized.uid),
        buildRoomMembershipBan({
          roomCode: operationRoomCode,
          member: normalized,
          bannedByUid: operationUserId,
          bannedByName: context.userName,
          createdAt: serverTimestamp()
        })
      );
      batch.delete(doc(db, "rooms", operationRoomCode, "players", normalized.uid));
      activeSnapshot.docs.forEach((entry) => batch.delete(entry.ref));
      await batch.commit();
      notify(`${normalized.displayName} was removed and blocked from rejoining.`);
      return refresh();
    } catch (error) {
      setStatus(`Could not block that player: ${error?.message || "Unknown error"}`, true);
      return false;
    }
  }

  async function unbanMember(member) {
    if (!context.isDm || !context.roomCode) return false;
    const normalized = normalizeRoomMember(member);
    if (!normalized.uid) return false;

    const confirmed = await requestConfirmation(
      `${normalized.displayName} will be able to use the room code again. Their membership is not recreated automatically.`,
      {
        title: "Allow this player to rejoin?",
        confirmLabel: "Allow Rejoin"
      }
    );
    if (!confirmed) return false;

    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "rooms", context.roomCode, "bannedUsers", normalized.uid));
      await batch.commit();
      notify(`${normalized.displayName} may rejoin with the room code.`);
      return refresh();
    } catch (error) {
      setStatus(`Could not allow rejoining: ${error?.message || "Unknown error"}`, true);
      return false;
    }
  }

  function setContext(next = {}) {
    const normalized = {
      roomCode: cleanText(next.roomCode, 32),
      roomName: cleanText(next.roomName, 120),
      isDm: next.isDm === true,
      userId: cleanText(next.userId, 128),
      userName: cleanText(next.userName, MAX_DISPLAY_NAME_LENGTH)
    };
    const changed = JSON.stringify(normalized) !== JSON.stringify(context);
    context = normalized;
    render();
    if (changed && context.isDm && context.roomCode) refresh();
  }

  function disconnect() {
    loadRevision += 1;
    loading = false;
    members = [];
    bans = [];
    context = {
      roomCode: "",
      roomName: "",
      isDm: false,
      userId: "",
      userName: ""
    };
    render();
    setStatus("");
  }

  root?.querySelector?.("[data-room-access-refresh]")
    ?.addEventListener("click", refresh);
  render();

  return Object.freeze({
    setContext,
    disconnect,
    refresh,
    getState: () => ({
      ...context,
      loading,
      memberCount: members.length,
      bannedCount: bans.length
    })
  });
}
