export async function copyLibraryRecordToRoom({
  db, collection, addDoc, updateDoc, serverTimestamp,
  asset, content, roomCode, roomData = {}, user = {}, now = Date.now()
} = {}) {
  const assetType = String(asset?.assetType || "");
  const collectionName = assetType === "monster" ? "monsters" : assetType === "map" ? "maps" : "";
  if (!collectionName) throw new Error("Only campaign monsters and maps can be copied into a room.");
  const destination = String(roomCode || "").toUpperCase();
  if (!destination) throw new Error("Open a destination room before copying campaign content.");
  if (String(asset.sourceRoomCode || asset.roomCode || "").toUpperCase() === destination) throw new Error("This asset already belongs to the current room.");
  const record = {
    ...(content || {}),
    id: null,
    roomCode: destination,
    ownerUid: roomData.dmUid || user.uid || "",
    ownerName: roomData.dmName || user.displayName || "Unnamed DM",
    copiedFromLibraryId: asset.libraryId || asset.assetId,
    copiedFromRoomCode: asset.sourceRoomCode || asset.roomCode || "",
    copiedFromRecordId: asset.sourceRecordId || content?.id || "",
    copiedAtMillis: now,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedAtMillis: now
  };
  const createdRef = await addDoc(collection(db, "rooms", destination, collectionName), record);
  await updateDoc(createdRef, { id: createdRef.id, updatedAt: serverTimestamp(), updatedAtMillis: now });
  return Object.freeze({ assetType, recordId: createdRef.id, record: { ...record, id: createdRef.id } });
}
