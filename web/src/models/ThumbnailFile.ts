export default interface ThumbnailFile {
    file: {
        id: string,
        repositoryId: string,
        parentId: string,
        name: string,
        path: string,
        blobId: string,
    },
    thumbnail: {
        id: string,
        width: number,
        height: number,
    }
}
