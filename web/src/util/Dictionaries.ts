export default class Dictionaries {
    public static toDictionary = function<T, K>(items: T[], keySelector: (entry: T) => string): { [key: string] : T } {
        const dictionary: { [key: string] : T } = {};
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            dictionary[keySelector(item)] = item;
        }
        return dictionary;
    }    
}
